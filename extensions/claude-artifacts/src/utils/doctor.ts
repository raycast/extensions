/// <reference types="node" />

import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
// From the `/plural` SUBPATH for the same reason as `/errors` above: the root
// export reaches `@raycast/api`, which has no loadable runtime outside Raycast
// and would make every branch in this module untestable headlessly.
import { countOf } from "@chrismessina/raycast-kit/plural";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { constants } from "fs";
import { access, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import path from "path";
import { promisify } from "util";

import { readHookStatus, resolveHookScript } from "./hook-status";
import { INDEX_PATH, readIndex } from "./index-file";
import { TRANSCRIPTS_DIR, scanTranscripts } from "./transcripts";
import type { Artifact } from "../types/artifact";

const execFileAsync = promisify(execFile);

/** Where the recording hook writes its breadcrumb trail. */
export const HOOK_LOG_PATH = path.join(homedir(), ".claude", "artifacts-hook.log");

/**
 * Severity of a single check, ordered by how much it should interrupt someone.
 *
 * `"warn"` and `"fail"` are distinct on purpose: a `"fail"` means artifacts are
 * being lost right now, a `"warn"` means something is off but the index is
 * still being written. Collapsing them would put "your titles may be stale"
 * next to "nothing has been recorded for nine days".
 */
export type CheckState = "ok" | "warn" | "fail" | "unknown";

export interface Check {
  id: string;
  title: string;
  state: CheckState;
  /** One line. Says what was observed, not what to do. */
  detail: string;
  /** One line. Says what to do. Absent when there is nothing to do. */
  remedy?: string;
  /**
   * Which action resolves this check, named explicitly.
   *
   * The view used to switch on `id`, which cannot distinguish a registration
   * that is MISSING from one that is DISABLED — and offering the setup flow for
   * a disabled hook appends a SECOND registration while leaving the kill switch
   * in place, so every future publish records twice and the block stays.
   */
  remedyKind?: "setup" | "update-script" | "unblock" | "show-index";
}

export interface Diagnosis {
  checks: Check[];
  /** Publishes found in the transcripts that the index does not have. */
  missing: Artifact[];
  filesScanned: number;
  /** Whether the backfill can run — it needs `jq` and `perl`. */
  canBackfill: boolean;
  /**
   * Whether the hook has ever written its log.
   *
   * Gates the "Show Hook Log" action: `Action.ShowInFinder` on a path that does
   * not exist fails at press time with a generic error, which on a diagnostics
   * screen reads as the diagnostics being broken rather than as the file being
   * absent.
   */
  hookLogExists: boolean;
  /** The recorder the registration actually points at, so prompts can name it. */
  scriptPath: string;
}

/**
 * A current-format URL used only to exercise the installed hook.
 *
 * The id is deliberately not a UUID: matching the CURRENT scheme is the whole
 * point of the self-test, and a UUID would pass against the very build of the
 * hook that this check exists to catch.
 */
const SELF_TEST_URL = "https://claude.ai/artifact/RaycastDoctorSelfTest1";
const SELF_TEST_ID = "RaycastDoctorSelfTest1";

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("/usr/bin/env", ["sh", "-c", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * A cheap identity for a file, used to prove the self-test did not touch it.
 *
 * `"absent"` is a real state, not an error: an index that does not exist before
 * and does not exist after is unchanged, which is exactly what we are asserting.
 */
async function fingerprint(file: string): Promise<string> {
  try {
    const info = await stat(file);
    return `${info.size}:${info.mtimeMs}`;
  } catch {
    return "absent";
  }
}

async function isExecutable(file: string): Promise<boolean> {
  try {
    await access(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function isReadable(file: string): Promise<boolean> {
  try {
    await access(file, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run the installed hook against a throwaway `HOME` and see whether it records.
 *
 * This is the check that matters, and the only one that could have caught the
 * 2026-09 outage. Every *structural* signal was green throughout it — the
 * script was installed, executable, registered, and running on every publish —
 * and the index still stopped growing, because the hook could no longer
 * recognize the URL format and its contract requires it to exit 0 regardless.
 * Presence tells you nothing; only behavior does.
 *
 * Confinement, stated precisely. `HOME` is an environment variable, not a
 * sandbox. Redirecting it works because the SHIPPED recorder derives both its
 * index and its log from `$HOME` and touches nothing else — but Doctor runs
 * whatever script the user registered, and a custom recorder with a hardcoded
 * absolute path would write the real index no matter what `HOME` says.
 *
 * So this refuses to run a script it cannot confine: the text has to show the
 * index being derived from `$HOME` before it is executed. Fails closed — an
 * unrecognized recorder is reported as unverifiable rather than exercised,
 * because the cost of guessing wrong is a junk row written into the user's
 * real index by their own script.
 */
async function runHookSelfTest(scriptPath: string, launcher?: string): Promise<{ recorded: boolean; detail: string }> {
  let sandbox: string | undefined;

  try {
    // Read before executing. The pattern matches how the shipped recorder
    // resolves its index (`INDEX="${HOME}/.claude/artifacts.json"`), in either
    // brace form.
    const source = await readFile(scriptPath, "utf8");
    if (!/\$\{?HOME\}?\/\.claude\/artifacts\.json/.test(source)) {
      return {
        recorded: false,
        detail:
          "Skipped — this recorder does not resolve its index from $HOME, so it cannot be exercised without risking a write to your real index.",
      };
    }

    sandbox = await mkdtemp(path.join(tmpdir(), "claude-artifacts-doctor-"));
    await mkdir(path.join(sandbox, ".claude"), { recursive: true });

    // Shaped like a real PostToolUse payload for a publish. `tool_input`
    // carries no title, so the hook has to reach the response — exercising the
    // same extraction path a real publish takes.
    //
    // Written to a file inside the sandbox and redirected in, rather than
    // piped: that lets `execFile` own the whole call, including the timeout,
    // instead of hand-rolling a Promise around `spawn` with its own timer.
    const payloadPath = path.join(sandbox, "payload.json");
    await writeFile(
      payloadPath,
      JSON.stringify({
        cwd: sandbox,
        tool_name: "Artifact",
        tool_input: { file_path: path.join(sandbox, "self-test.html") },
        tool_response: {
          url: SELF_TEST_URL,
          artifact_id: "00000000-0000-4000-8000-000000000000",
          title: "Doctor Self-Test",
          updated: false,
          audience: "owner",
        },
      }),
      "utf8",
    );

    // The text check above is a cheap pre-filter and CANNOT prove confinement —
    // the pattern it looks for could sit in a comment while the script writes
    // somewhere else entirely. So the real index is fingerprinted before and
    // after, and a script that touched it is reported rather than trusted.
    // Observation beats a promise: this turns "should be confined" into
    // "was confined, and here is how I know".
    const realIndexBefore = await fingerprint(INDEX_PATH);

    // A hook that hangs must not hang the command. The script's own lock wait
    // is 10s, so 15s only fires when the script itself is wedged — and the
    // default SIGTERM lets its `trap` clean up, which SIGKILL would not.
    let exitCode = 0;
    let timedOut = false;
    try {
      // Run it the way the registration does. `bash /path/rec.sh` needs no
      // execute bit, so exec'ing the script directly would fail a recorder that
      // works perfectly in Claude Code.
      const invocation = launcher ? `exec ${launcher} "$1" < "$2"` : 'exec "$1" < "$2"';
      await execFileAsync("/bin/sh", ["-c", invocation, "sh", scriptPath, payloadPath], {
        env: { ...process.env, HOME: sandbox },
        timeout: 15_000,
      });
    } catch (error) {
      const failure = error as { code?: number; killed?: boolean };
      exitCode = failure.code ?? 1;
      timedOut = failure.killed === true;
    }

    if ((await fingerprint(INDEX_PATH)) !== realIndexBefore) {
      return {
        recorded: false,
        detail:
          "This recorder wrote to your real index while being tested with a temporary HOME — it does not resolve its index from $HOME. Nothing further was run.",
      };
    }

    let written: string;
    try {
      written = await readFile(path.join(sandbox, ".claude", "artifacts.json"), "utf8");
    } catch {
      return {
        recorded: false,
        detail:
          exitCode === 0
            ? "The hook ran and exited cleanly but wrote nothing — it did not recognize the artifact URL."
            : `The hook exited ${exitCode} without writing an index.`,
      };
    }

    // Parsed, not substring-matched. A file merely CONTAINING the id proves
    // nothing the reader can use: the real index is read with `JSON.parse` and
    // a row lookup, so a hook that emits malformed JSON — or the id inside a
    // log line or an error message — would otherwise be reported healthy while
    // the extension still cannot load a thing.
    let rows: unknown;
    try {
      const parsed: unknown = JSON.parse(written);
      rows = Array.isArray(parsed) ? parsed : (parsed as { artifacts?: unknown })?.artifacts;
    } catch {
      return { recorded: false, detail: "The hook wrote an index, but it is not valid JSON." };
    }

    const recorded = Array.isArray(rows) && rows.some((row) => (row as { id?: unknown })?.id === SELF_TEST_ID);
    if (!recorded) {
      return { recorded: false, detail: "The hook wrote an index but did not record the test artifact." };
    }

    // Recording is necessary but not sufficient. The hook's contract is that it
    // must never fail a Claude Code turn, so a recorder that writes the row and
    // then exits non-zero — or hangs past the timeout — is still unhealthy in
    // the real PostToolUse path. Reporting it `ok` because a row appeared is
    // the same false-healthy shape this whole check exists to eliminate.
    if (timedOut) {
      return {
        recorded: false,
        detail: "The hook recorded the test artifact but never exited — it hung, and a real publish would too.",
      };
    }
    if (exitCode !== 0) {
      return {
        recorded: false,
        detail: `The hook recorded the test artifact but exited ${exitCode}. A recorder must always exit 0 so it cannot fail a Claude Code turn.`,
      };
    }

    return { recorded: true, detail: "The installed hook recorded a current-format artifact URL." };
  } catch (error) {
    return { recorded: false, detail: `Could not run the hook: ${getErrorMessage(error)}` };
  } finally {
    if (sandbox) await rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Failed extractions logged since the last successful record.
 *
 * Turns "your index looks short" into evidence. Each of these lines is one
 * artifact the hook saw, could not parse, and dropped.
 */
async function recentDropCount(): Promise<number | undefined> {
  let log: string;
  try {
    log = await readFile(HOOK_LOG_PATH, "utf8");
  } catch {
    return undefined;
  }

  const lines = log.split("\n").filter((line) => line.length > 0);
  const lastRecorded = lines.findLastIndex((line) => line.includes(" recorded "));
  return lines.slice(lastRecorded + 1).filter((line) => line.includes("no artifact URL found")).length;
}

export async function diagnose(): Promise<Diagnosis> {
  const checks: Check[] = [];

  const [hasJq, hasPerl, resolved] = await Promise.all([
    commandExists("jq"),
    commandExists("perl"),
    resolveHookScript(),
  ]);
  const { path: scriptPath, launcher } = resolved;

  const missingDeps = [!hasJq && "jq", !hasPerl && "perl"].filter((d): d is string => Boolean(d));
  checks.push({
    id: "dependencies",
    title: "Hook Dependencies",
    state: missingDeps.length === 0 ? "ok" : "fail",
    detail: missingDeps.length === 0 ? "jq and perl are both available." : `Not on PATH: ${missingDeps.join(", ")}.`,
    remedy:
      missingDeps.length === 0
        ? undefined
        : `Install with: brew install ${missingDeps.join(" ")}. The hook exits silently without them, so nothing is recorded and nothing is reported.`,
  });

  // --- The recorder script itself -----------------------------------------
  let scriptInstalled = false;
  try {
    const info = await stat(scriptPath);
    scriptInstalled = info.isFile();
  } catch {
    scriptInstalled = false;
  }

  // A launcher-run registration (`bash /path/rec.sh`) only needs the script to
  // be READABLE — bash opens it, it is never exec'd. Demanding the execute bit
  // there reports a healthy recorder as broken and tells the user to chmod a
  // file that did not need it.
  const scriptRunnable = scriptInstalled && (await (launcher ? isReadable : isExecutable)(scriptPath));

  // Named once, then read twice. `detail` and `remedy` cover the same three
  // states, and expressing them as nested ternaries that branched in OPPOSITE
  // orders (`!scriptInstalled` first vs `scriptInstalled` first) made a
  // mismatch between the two invisible.
  const scriptCondition = !scriptInstalled ? "absent" : scriptRunnable ? "ok" : "not-runnable";

  checks.push({
    id: "script",
    title: "Recorder Script",
    state: scriptRunnable ? "ok" : "fail",
    detail: {
      absent: `No script at ${scriptPath}.`,
      ok: `Installed at ${scriptPath}.`,
      "not-runnable": launcher
        ? `Present at ${scriptPath} but not readable.`
        : `Present at ${scriptPath} but not executable.`,
    }[scriptCondition],
    remedy: {
      absent: "Install the recorder — the setup prompt below walks Claude Code through it.",
      ok: undefined,
      "not-runnable": launcher ? `Run: chmod +r ${scriptPath}` : `Run: chmod +x ${scriptPath}`,
    }[scriptCondition],
    remedyKind: scriptCondition === "absent" ? "setup" : undefined,
  });

  // --- Registration --------------------------------------------------------
  const hookStatus = await readHookStatus();
  checks.push({
    id: "registration",
    title: "Hook Registration",
    state: hookStatus === "registered" ? "ok" : hookStatus === "unknown" ? "unknown" : "fail",
    detail: {
      registered: "Registered as a PostToolUse hook for the Artifact tool.",
      missing: "No artifact recorder is registered in your Claude Code settings.",
      disabled: "Registered, but hooks are switched off (disableAllHooks or allowManagedHooksOnly).",
      unknown: "Could not read your Claude Code settings.",
    }[hookStatus],
    remedyKind: hookStatus === "missing" ? "setup" : hookStatus === "disabled" ? "unblock" : undefined,
    remedy:
      hookStatus === "registered"
        ? undefined
        : hookStatus === "disabled"
          ? "Clear disableAllHooks / allowManagedHooksOnly in ~/.claude/settings.json."
          : hookStatus === "missing"
            ? "Copy the setup prompt below and paste it into Claude Code."
            : "Check that ~/.claude/settings.json exists and is valid JSON.",
  });

  // --- The behavioral check ----------------------------------------------
  const selfTest = scriptRunnable
    ? await runHookSelfTest(scriptPath, launcher)
    : { recorded: false, detail: "Skipped — there is no runnable script to test." };

  // Shown ONLY on the failing branch. The count is historical — every one of
  // those drops happened before whatever state the hook is in right now — so
  // appending it to a passing row reads as "still dropping" and contradicts
  // the OK it is attached to. On the failure branch it is the evidence; on the
  // success branch the Coverage check below already reports what was lost.
  const drops = await recentDropCount();
  const dropNote =
    !selfTest.recorded && drops && drops > 0
      ? ` The log shows ${countOf(drops, "publish")} dropped since the last record.`
      : "";

  checks.push({
    id: "self-test",
    title: "Records Current Artifact URLs",
    state: selfTest.recorded ? "ok" : scriptRunnable ? "fail" : "unknown",
    detail: selfTest.detail + dropNote,
    remedy: selfTest.recorded
      ? undefined
      : scriptRunnable
        ? "Your copy of the recorder is out of date. Copy the update prompt below and paste it into Claude Code — it takes effect on the next publish, with no restart."
        : undefined,
    remedyKind: selfTest.recorded ? undefined : scriptRunnable ? "update-script" : undefined,
  });

  // --- The index -----------------------------------------------------------
  const index = await readIndex();
  checks.push({
    id: "index",
    title: "Artifact Index",
    state: index.problem === "malformed" ? "fail" : index.problem === "missing" ? "warn" : "ok",
    detail:
      index.problem === "malformed"
        ? `${INDEX_PATH} could not be read: ${index.errorMessage ?? "unknown error"}`
        : index.problem === "missing"
          ? `No index at ${INDEX_PATH} yet.`
          : `${countOf(index.artifacts.length, "artifact")} across ${countOf(index.projects.length, "project")}.`,
    remedy:
      index.problem === "malformed"
        ? "Move the file aside and let the backfill rebuild it from your transcripts."
        : undefined,
    remedyKind: index.problem === "malformed" ? "show-index" : undefined,
  });

  // --- Coverage against the transcripts ------------------------------------
  const scan = await scanTranscripts();
  const known = new Set(index.artifacts.map((a) => a.id));
  const missing = scan.artifacts.filter((a) => !known.has(a.id));

  // Zero files scanned is NOT evidence of coverage. `scanTranscripts` reports an
  // unreadable or absent transcripts directory the same way it reports a fresh
  // Claude Code install — as an empty successful scan — and rendering that as
  // "everything is indexed" is a false healthy built on a scan that never
  // happened.
  const noTranscripts = scan.filesScanned === 0;
  // An unread file is a hole in the scan, so "nothing missing" is not a claim it
  // earned. Degrade to a warning that says exactly how big the hole is.
  const incomplete = scan.filesFailed > 0;

  checks.push({
    id: "coverage",
    title: "Index Coverage",
    state: noTranscripts ? "unknown" : missing.length === 0 && !incomplete ? "ok" : "warn",
    detail: noTranscripts
      ? `No transcripts found at ${TRANSCRIPTS_DIR}, so coverage could not be checked.`
      : missing.length === 0
        ? `Nothing missing — searched ${countOf(scan.filesScanned, "transcript")}.${
            incomplete
              ? ` ${countOf(scan.filesFailed, "transcript")} could not be read, so this is not a complete picture.`
              : ""
          }`
        : `${countOf(missing.length, "artifact")} missing — searched ${countOf(scan.filesScanned, "transcript")}.${
            incomplete ? ` ${countOf(scan.filesFailed, "transcript")} could not be read.` : ""
          }`,
    remedy: noTranscripts
      ? "Claude Code writes them there as you work; nothing to do if you have not used it on this machine."
      : missing.length === 0
        ? undefined
        : "Run Backfill Missing Artifacts to add them.",
  });

  const hookLogExists = await stat(HOOK_LOG_PATH).then(
    (info) => info.isFile(),
    () => false,
  );

  return {
    checks,
    missing,
    filesScanned: scan.filesScanned,
    canBackfill: hasJq && hasPerl,
    hookLogExists,
    scriptPath,
  };
}

/**
 * Merge program. **Strictly append-only: no existing row is read, rewritten, or
 * dropped.**
 *
 * An earlier version keyed both sides into objects and merged them, which was
 * wrong twice over. `from_entries` silently discards any row without a string
 * `id` — a non-object, a hand-edited fragment, anything an older writer left —
 * so a "backfill" could delete rows, contradicting the guarantee this function
 * advertises. And overlaying new fields onto an existing row means a snapshot
 * taken before the lock can overwrite a *newer* value the hook wrote in the
 * meantime; the lock serializes writes, it does not make a stale read fresh.
 *
 * Appending only removes both. Callers pass rows already determined to be
 * absent, so there is nothing legitimate to overlay — and an id that appeared
 * between the scan and the lock is now left exactly as the hook wrote it.
 *
 * Runs inside the lock rather than in Node so the read, the filter, and the
 * write are one critical section.
 *
 * Two jq traps this had to survive, both caught by running the program against
 * a deliberately hostile index rather than by reading it:
 *
 * - `$curids | index(.id)` does NOT work. The pipe rebinds `.` to `$curids`,
 *   so `.id` asks an array for a field. Bind the row first (`. as $row`).
 * - Rebuilding the output as a fresh `{ version, artifacts }` silently drops
 *   any other top-level key the file carried. Assigning onto `$idx` keeps
 *   whatever is there, known to this code or not.
 */
const MERGE_PROGRAM = `
def norm: if type == "array" then { version: 1, artifacts: . } else . end;

(.[0] | norm) as $idx
| (($idx.artifacts // []) | if type == "array" then . else [] end) as $cur
| [$cur[] | select(type == "object") | .id | select(type == "string")] as $curids
| ((.[1] | if type == "array" then . else [] end)
   | map(select(type == "object" and (.id | type == "string")))
   | map(. as $row | select(($curids | index($row.id)) == null))) as $additions
| $idx
| .version = (.version // 1)
| .artifacts = ($cur + $additions)
`;

/**
 * Hold the same kernel lock the recorder uses, then merge inside it.
 *
 * `perl -e flock` rather than a lockfile, because macOS ships no `flock(1)` and
 * an mtime-based reaper cannot distinguish a dead holder from a slow one. This
 * is the recorder's own primitive, reused verbatim so the two writers actually
 * exclude each other — a second, different locking scheme would exclude
 * nothing. The lock is held for the lifetime of this perl process, which spans
 * the synchronous `system()` below, and the kernel releases it on exit however
 * that exit happens.
 */
const LOCK_PROGRAM = `
use Fcntl qw(:flock);
my ($lockfile, $timeout, $script) = @ARGV;
open(my $fh, ">>", $lockfile) or exit 75;
eval {
  local $SIG{ALRM} = sub { die "timeout\\n" };
  alarm $timeout;
  flock($fh, LOCK_EX) or die "flock\\n";
  alarm 0;
  1;
} or exit 75;
my $rc = system("/bin/sh", "-c", $script);
exit($rc == 0 ? 0 : 1);
`;

/**
 * The critical section. Ordinary POSIX sh; every path leaves the index either
 * untouched or completely replaced, never half-written.
 *
 * `mktemp` deliberately creates the temp file BESIDE the index so the final
 * `mv -f` is a same-filesystem rename and therefore atomic. A temp file in
 * `$TMPDIR` could land on another volume and degrade the rename into a copy.
 */
const MERGE_SHELL = `
set -u
INDEX="$DOCTOR_INDEX"

if [ ! -s "$INDEX" ]; then
  INIT="$(mktemp "$INDEX.XXXXXX")" || exit 1
  printf '{"version":1,"artifacts":[]}' >"$INIT" || { rm -f "$INIT"; exit 1; }
  mv -f "$INIT" "$INDEX" || { rm -f "$INIT"; exit 1; }
fi

cp -p "$INDEX" "$DOCTOR_BACKUP" || exit 1

TMP="$(mktemp "$INDEX.XXXXXX")" || exit 1
jq -s -f "$DOCTOR_PROGRAM" "$INDEX" "$DOCTOR_NEW" >"$TMP" 2>/dev/null || { rm -f "$TMP"; exit 1; }
[ -s "$TMP" ] || { rm -f "$TMP"; exit 1; }

# Report what LANDED, not what was asked for. The merge drops any requested row
# whose id the hook wrote between the scan and the lock — correct behavior, but
# it means the requested count is not the added count, and a toast claiming
# otherwise is the UI lying about its own state.
# Normalize both accepted shapes. readIndex takes a bare array too, and the
# merge wraps it — so counting only .artifacts scores a legacy bare-array file
# as zero and reports every pre-existing row as newly added.
count() { jq '[(if type == "array" then . else .artifacts end)[]? | select(type == "object")] | length' "$1" 2>/dev/null || echo 0; }
echo $(( $(count "$TMP") - $(count "$INDEX") )) >"$DOCTOR_COUNT"

mv -f "$TMP" "$INDEX" || { rm -f "$TMP"; exit 1; }
exit 0
`;

export interface BackfillResult {
  added: number;
  backupPath: string;
}

/**
 * Add the given artifacts to the index, preserving everything already there.
 *
 * Additive by construction: rows are merged by id, no row is ever dropped, and
 * the previous file is copied aside first. The index holds rows the transcripts
 * cannot reproduce — the original seed was captured from the artifact listing
 * and has no transcript behind it — so a true regenerate-from-scratch would
 * silently delete real history. This adds and never subtracts.
 */
export async function backfill(artifacts: Artifact[]): Promise<BackfillResult> {
  if (artifacts.length === 0) return { added: 0, backupPath: "" };

  const workDir = await mkdtemp(path.join(tmpdir(), "claude-artifacts-backfill-"));
  const newRowsPath = path.join(workDir, "new.json");
  const programPath = path.join(workDir, "merge.jq");
  const countPath = path.join(workDir, "added.txt");
  // Millisecond precision alone is not unique — two backfills starting in the
  // same millisecond would name the same file and the second `cp -p` would
  // overwrite the first's recovery copy. The suffix makes the promised backup
  // actually survive.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${INDEX_PATH}.backup-${stamp}-${randomUUID().slice(0, 8)}`;

  try {
    // Written as the index's own row shape. `undefined` fields drop out of
    // JSON.stringify, which is what the index wants — an absent `project` is
    // meaningful, a `null` one is not.
    await writeFile(newRowsPath, JSON.stringify(artifacts), "utf8");
    await writeFile(programPath, MERGE_PROGRAM, "utf8");

    await execFileAsync("/usr/bin/env", ["perl", "-e", LOCK_PROGRAM, `${INDEX_PATH}.lock`, "10", MERGE_SHELL], {
      env: {
        ...process.env,
        DOCTOR_INDEX: INDEX_PATH,
        DOCTOR_NEW: newRowsPath,
        DOCTOR_PROGRAM: programPath,
        DOCTOR_BACKUP: backupPath,
        DOCTOR_COUNT: countPath,
      },
    });

    // Fall back to the requested count only if the side-channel is unreadable —
    // an over-report is better than claiming zero on a merge that succeeded.
    const added = Number.parseInt(await readFile(countPath, "utf8").catch(() => ""), 10);
    return { added: Number.isFinite(added) && added >= 0 ? added : artifacts.length, backupPath };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** A plain-text report, for pasting into an issue or into Claude Code. */
export function diagnosticsReport(diagnosis: Diagnosis): string {
  const symbol: Record<CheckState, string> = { ok: "OK  ", warn: "WARN", fail: "FAIL", unknown: "????" };

  const lines = [
    "Claude Artifacts — Doctor",
    `Index: ${INDEX_PATH}`,
    `Hook log: ${HOOK_LOG_PATH}`,
    "",
    ...diagnosis.checks.flatMap((check) => [
      `${symbol[check.state]} ${check.title}`,
      `     ${check.detail}`,
      ...(check.remedy ? [`     → ${check.remedy}`] : []),
    ]),
  ];

  if (diagnosis.missing.length > 0) {
    lines.push("", `Not indexed (${diagnosis.missing.length}):`);
    for (const artifact of diagnosis.missing) {
      lines.push(`  ${artifact.updated ?? "no date"}  ${artifact.title}  ${artifact.url}`);
    }
  }

  return lines.join("\n");
}
