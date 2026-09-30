import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useRef, useState } from "react";
import { analyze, type AnalyzeCounts, type HashCacheState, type Phase } from "./core/analyze.js";
import { canonicalPath, isInsideDir, loadConfig } from "./core/config.js";
import { executePlan, relativeToDest } from "./core/execute.js";
import { bucketLabel, formatSize, type PlanEntry } from "./core/plan.js";
import { describeError } from "./errors.js";

interface FormValues {
  source: string[];
  dest: string[];
  inPlace: boolean;
  recursive: boolean;
  smart: boolean;
}

// ---------- English copy (core returns data and codes only) ----------

const PHASE_TEXT: Partial<Record<Phase, string | ((info: { files?: number; done?: number }) => string)>> = {
  scanning: "Scanning…",
  dedup: ({ files }) => `Checking ${files} files for exact duplicates…`,
  health: "Looking for broken files and OS junk…",
  similar: "Looking for near-duplicates…",
  perceptual: ({ files, done }) => (done ? `Comparing images (${done}/${files})…` : "Comparing images…"),
  planning: "Building the plan…",
};

const ISSUE_TEXT: Record<string, string> = {
  empty: "Zero-byte file",
  corrupt: "Content doesn't match the extension",
  junk: "OS junk file",
};

const SIMILAR_TEXT: Record<string, string> = {
  versioned: "Another version of the same release",
  "normalized-name": "The same thing under a different name",
  "same-stem": "The same name in another format",
};

/**
 * The block appended to <dest>/.tidy/similar.md after a run that flagged
 * anything. Paths are post-move and relative to the archive: this report exists
 * because the flags are visible nowhere else once the plan is gone, so it has
 * to say where each file actually ended up — and since it sits inside that
 * archive, an absolute prefix on every line would only bury the names.
 */
function formatSimilarBlock(flagged: PlanEntry[], { destDir }: { destDir: string }) {
  const lines = [`\n## ${new Date().toISOString()}\n`];
  const peers = (list: string[]) => list.map((p) => `\`${relativeToDest(p, destDir)}\``).join(", ");
  for (const e of flagged) {
    const name = relativeToDest(e.to, destDir);
    if (e.perceptual) {
      const best = e.perceptual.best ? " (largest of the set)" : "";
      lines.push(`- \`${name}\`${best}\n  looks nearly identical to ${peers(e.perceptual.peers)}`);
    }
    if (e.similar) {
      const what = SIMILAR_TEXT[e.similar.reason] ?? e.similar.reason;
      const best = e.similar.best ? " (this one looks the most complete)" : "";
      lines.push(`- \`${name}\`${best}\n  ${what}: ${peers(e.similar.peers)}`);
    }
  }
  return lines.join("\n") + "\n";
}

function isDirectory(filePath: string) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export default function TidyFolderCommand() {
  const { push } = useNavigation();
  const { defaultDest } = getPreferenceValues<Preferences.TidyFolder>();
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [destError, setDestError] = useState<string | undefined>();
  const [inPlace, setInPlace] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const pickedSource = values.source[0];
    if (!pickedSource) {
      setSourceError("Pick a folder to tidy");
      return;
    }
    const pickedDest = values.inPlace ? pickedSource : (values.dest[0] ?? defaultDest);
    if (!pickedDest) {
      setDestError("Pick a destination folder, or set a default one in the extension preferences");
      return;
    }
    // A folder picked earlier (or a stale default destination) may be gone or
    // replaced by a file by the time the form is submitted.
    if (!isDirectory(pickedSource)) {
      setSourceError("The selected source folder no longer exists");
      return;
    }
    if (fs.existsSync(pickedDest) && !isDirectory(pickedDest)) {
      setDestError("The selected destination is not a folder");
      return;
    }
    // Canonicalize before the containment check so symlinked or differently
    // spelled paths (e.g. /var vs /private/var) can't sneak past it.
    const sourceDir = canonicalPath(pickedSource);
    const destDir = canonicalPath(pickedDest);
    if (!values.inPlace && (isInsideDir(sourceDir, destDir) || isInsideDir(destDir, sourceDir))) {
      setDestError("Source and destination can't contain each other; enable “Tidy in place” instead");
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning…" });
    try {
      const config = loadConfig();
      if (!values.smart) config.detect = false;
      const { entries, sourceFiles, counts, hashCache } = await analyze({
        sourceDir,
        destDir,
        config,
        recursive: values.recursive,
        inPlace: values.inPlace,
        onPhase: (phase: Phase, info) => {
          const text = PHASE_TEXT[phase];
          if (text) toast.title = typeof text === "function" ? text(info ?? {}) : text;
        },
      });
      if (!sourceFiles.length) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing to tidy";
        toast.message = "Hidden files and subfolders are skipped; enable “Include subfolders” to recurse";
        return;
      }
      await toast.hide();
      // Shown after the progress toast is gone — earlier it would be replaced
      // by the first phase update within the same tick and never be seen.
      if (config._staleCategories?.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Config is missing newer categories: ${config._staleCategories.join(", ")}`,
          message: `Those files will land in ${config.fallbackCategory}. Add them in ${config._path} to enable.`,
        });
      }
      push(
        <PlanView entries={entries} counts={counts} sourceDir={sourceDir} destDir={destDir} hashCache={hashCache} />,
      );
    } catch (err) {
      const { title, message } = describeError(err, "Scan failed");
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Tidy Plan" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="source"
        title="Folder to Tidy"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={sourceError}
        onChange={() => setSourceError(undefined)}
      />
      <Form.Checkbox
        id="inPlace"
        label="Tidy in place (create category folders inside the source folder)"
        value={inPlace}
        onChange={setInPlace}
      />
      {!inPlace && (
        <Form.FilePicker
          id="dest"
          title="Destination"
          allowMultipleSelection={false}
          canChooseDirectories
          canChooseFiles={false}
          info={
            defaultDest
              ? `Leave empty to use the default destination: ${defaultDest}`
              : "Leave empty to use the default destination from preferences (not set yet)"
          }
          error={destError}
          onChange={() => setDestError(undefined)}
        />
      )}
      <Form.Checkbox id="recursive" label="Include subfolders" defaultValue={false} />
      <Form.Checkbox
        id="smart"
        label="Smart checks (near-duplicates, broken files, visually similar images)"
        defaultValue={true}
        info="Near-duplicates and similar images are only flagged — they're still archived normally, and each run that flags any writes a report to .tidy/similar.md in the destination. Broken files and OS junk are moved to a review folder."
      />
      <Form.Description text="You'll see the full plan first — nothing moves until you confirm." />
    </Form>
  );
}

function PlanView({
  entries,
  counts,
  sourceDir,
  destDir,
  hashCache,
}: {
  entries: PlanEntry[];
  counts: AnalyzeCounts;
  sourceDir: string;
  destDir: string;
  hashCache: HashCacheState | null;
}) {
  // A ref, not the state flag: two Enter presses land in the same render pass,
  // and both would still see `executing === false`.
  const executingRef = useRef(false);
  const [executing, setExecuting] = useState(false);
  const archives = entries.filter((e) => e.action === "archive");
  const dups = entries.filter((e) => e.action === "duplicate");
  const reviews = entries.filter((e) => e.action === "review");

  const byBucket = new Map<string, PlanEntry[]>();
  for (const e of archives) {
    const bucket = bucketLabel(e, destDir);
    const items = byBucket.get(bucket);
    if (items) items.push(e);
    else byBucket.set(bucket, [e]);
  }

  async function execute() {
    if (executingRef.current) return;
    executingRef.current = true;
    setExecuting(true);
    let toast: Toast | undefined;
    try {
      const destMissing = !fs.existsSync(destDir);
      const ok = await confirmAlert({
        title: destMissing ? "Create destination and tidy?" : "Run this tidy plan?",
        message:
          `${destMissing ? `Destination ${destDir} doesn't exist and will be created.\n` : ""}` +
          `Archive ${archives.length} files, quarantine ${dups.length} duplicates, ` +
          `move ${reviews.length} to review → ${destDir}`,
        primaryAction: { title: "Tidy", style: Alert.ActionStyle.Default },
      });
      if (!ok) return;

      toast = await showToast({ style: Toast.Style.Animated, title: "Tidying…" });
      const { similarReportPath, reportErrors } = executePlan(entries, {
        destDir,
        sourceDir,
        hashCache,
        formatSimilarBlock,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Done: ${counts.archive} archived, ${counts.duplicate} duplicates, ${counts.review} to review`;
      // A record that couldn't be appended rides along on the success toast:
      // every file moved, so calling this a failure would be a lie about the
      // archive — and it would hide the undo hint the user may still want.
      const notWritten = reportErrors.map((e) => describeError(e, "").title).join(", ");
      toast.message = notWritten ? `${notWritten} — use “Undo Last Tidy” to revert` : "Use “Undo Last Tidy” to revert";
      toast.primaryAction = {
        title: "Open Destination",
        onAction: () => open(destDir),
      };
      // The flagged files were archived normally, so once this toast is gone
      // nothing on disk shows which ones were grouped together — the report is
      // the only way back to them.
      if (similarReportPath) {
        toast.secondaryAction = {
          title: "Open Look-Alike Report",
          onAction: () => open(similarReportPath),
        };
      }
      await popToRoot();
    } catch (err) {
      // The plan is built before the confirmation, so a failure here can land
      // before the progress toast exists.
      const { title, message } = describeError(err, "Tidy failed");
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = title;
        toast.message = message;
      } else {
        await showToast({ style: Toast.Style.Failure, title, message });
      }
    } finally {
      executingRef.current = false;
      setExecuting(false);
    }
  }

  const executeAction = (
    <ActionPanel>
      <Action title="Run Tidy Plan" icon={Icon.Checkmark} onAction={execute} />
      <Action.ShowInFinder path={sourceDir} />
    </ActionPanel>
  );

  /** Advisory flags — these never changed where the file goes. */
  function annotations(e: PlanEntry) {
    const out: string[] = [];
    if (e.similar) {
      const peers = e.similar.peers.map((p) => path.basename(p)).join(", ");
      out.push(`${SIMILAR_TEXT[e.similar.reason] ?? e.similar.reason}: ${peers}`);
    }
    if (e.perceptual) {
      const peers = e.perceptual.peers.map((p) => path.basename(p)).join(", ");
      out.push(`Looks nearly identical to ${peers}`);
    }
    return out;
  }

  const smartSummary = [
    counts.similar ? `${counts.similar} near-duplicate` : null,
    counts.perceptual ? `${counts.perceptual} visually similar` : null,
  ].filter(Boolean);

  return (
    <List
      isLoading={executing}
      navigationTitle={`Tidy Plan (${entries.length} Files)`}
      searchBarPlaceholder={
        smartSummary.length ? `Flagged: ${smartSummary.join(", ")} — still archived normally` : "Filter files…"
      }
    >
      {[...byBucket.keys()].sort().map((bucket) => (
        <List.Section key={bucket} title={bucket} subtitle={`${byBucket.get(bucket)!.length} files`}>
          {byBucket.get(bucket)!.map((e) => {
            const notes = annotations(e);
            return (
              <List.Item
                key={e.from}
                // The name it will actually land under — the plan already
                // resolved " (n)" suffixes for collisions.
                title={path.basename(e.to)}
                subtitle={notes.join(" · ")}
                icon={Icon.Document}
                accessories={[
                  ...(notes.length ? [{ tag: { value: "flagged", color: Color.Orange } }] : []),
                  { text: formatSize(e.size) },
                  ...(e.dateBucket
                    ? [
                        {
                          tag:
                            e.dateSource === "exif"
                              ? { value: "EXIF", color: Color.Green }
                              : { value: "file date", color: Color.SecondaryText },
                        },
                      ]
                    : []),
                ]}
                actions={executeAction}
              />
            );
          })}
        </List.Section>
      ))}
      {dups.length > 0 && (
        <List.Section title="Exact duplicates (quarantined)" subtitle={`${dups.length} files`}>
          {dups.map((e) => (
            <List.Item
              key={e.from}
              title={path.basename(e.to)}
              subtitle={`Identical to ${path.basename(e.keeperPath ?? "")}`}
              icon={{ source: Icon.Duplicate, tintColor: Color.Magenta }}
              accessories={[{ text: formatSize(e.size) }]}
              actions={executeAction}
            />
          ))}
        </List.Section>
      )}
      {reviews.length > 0 && (
        <List.Section title="Needs review (moved, never deleted)" subtitle={`${reviews.length} files`}>
          {reviews.map((e) => (
            <List.Item
              key={e.from}
              title={path.basename(e.to)}
              subtitle={
                (ISSUE_TEXT[e.issue ?? ""] ?? e.issue) +
                (e.issue === "corrupt" ? ` (claims to be .${e.issueDetail})` : "")
              }
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              accessories={[{ text: formatSize(e.size) }]}
              actions={executeAction}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
