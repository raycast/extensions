/**
 * Read a tap's repository with git, without checking anything out: a partial
 * clone (`--filter=blob:none --depth 1 --no-checkout`) fetches the latest
 * commit's tree, which is enough to list the files, and the README is the one
 * file read. The folder is temporary and removed before returning.
 *
 * git rather than GitHub's API: no hourly limit (60 unauthenticated requests
 * an hour ran out within one afternoon of testing), any host brew can tap
 * from, and private repositories the user's git credentials already reach.
 */

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { getErrorMessage } from "../errors";
import type { RepoReader } from "./tapPreflight";

const execFileAsync = promisify(execFile);

/** macOS's git. Homebrew itself requires the Command Line Tools, which provide it. */
const GIT = "/usr/bin/git";
const TIMEOUT_MS = 30_000;

async function git(args: string[], signal?: AbortSignal): Promise<string> {
  const { stdout } = await execFileAsync(GIT, args, {
    signal,
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // Never ask: Raycast has no terminal to answer in, and a prompt would
    // hang the check. Saved credentials (the keychain helper) still work.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  });
  return stdout;
}

/** The README brew users would read on the repository's page, if there is one at the top. */
function readmeName(paths: string[]): string | undefined {
  const readmes = paths.filter((p) => /^readme(\.[a-z]+)?$/i.test(p));
  return readmes.find((p) => /\.md$/i.test(p)) ?? readmes[0];
}

/**
 * What git says when a repository is not there, or not ours to read. GitHub
 * answers a private repository exactly as a missing one, so the two are one
 * verdict: misspelled, or private.
 */
const NOT_FOUND =
  /not found|does not exist|does not appear to be a git repository|could not read Username|Authentication failed|terminal prompts disabled|returned error: 40[34]/i;

export const gitReader: RepoReader = async (url, { readme: wantReadme, signal }) => {
  let dir: string | undefined;
  try {
    dir = await mkdtemp(join(tmpdir(), "brew-tap-check-"));
    try {
      await git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", "--depth", "1", "--", url, dir], signal);
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
      if (signal?.aborted) return { kind: "unchecked", reason: "Canceled" };
      if (e.code === "ENOENT") return { kind: "unchecked", reason: "git isn't available" };
      if (e.killed) return { kind: "unchecked", reason: "The repository took too long to read" };
      if (NOT_FOUND.test(e.stderr ?? "")) return { kind: "not-found" };
      const line = (e.stderr ?? "").split("\n").find((l) => l.startsWith("fatal:")) ?? e.message;
      return { kind: "unchecked", reason: line.replace(/^fatal:\s*/, "") };
    }
    // An empty repository clones fine but has no HEAD to list. Any other
    // failure from here on is a read that didn't finish, so it throws to the
    // catch below and reads as unchecked rather than as an empty repository.
    const hasHead = await git(["-C", dir, "rev-parse", "--verify", "--quiet", "HEAD"], signal).then(
      () => true,
      () => false,
    );
    if (signal?.aborted) return { kind: "unchecked", reason: "Canceled" };
    if (!hasHead) return { kind: "ok", paths: [], readme: "" };
    const paths = (await git(["-C", dir, "ls-tree", "-r", "--name-only", "HEAD"], signal)).split("\n").filter(Boolean);
    // The README is one more fetch, since the clone left out every file's contents.
    const name = wantReadme ? readmeName(paths) : undefined;
    const readme = name ? await git(["-C", dir, "show", `HEAD:${name}`], signal) : "";
    return { kind: "ok", paths, readme };
  } catch (err) {
    if (signal?.aborted) return { kind: "unchecked", reason: "Canceled" };
    return { kind: "unchecked", reason: getErrorMessage(err) };
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
};
