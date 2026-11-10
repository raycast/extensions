import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import { ENV, tildify } from "./tuios";

const run = promisify(execFile);

/** Make (or reuse) a worktree next to the repo: ../<repo>-<branch>. Returns its path. */
export async function makeWorktree(dir: string, branch: string): Promise<string> {
  const git = (...args: string[]) => run("git", ["-C", dir, ...args], { env: ENV }).then((r) => r.stdout.trim());
  const top = await git("rev-parse", "--show-toplevel").catch(() => {
    throw new Error(`${tildify(dir)} is not a git repository`);
  });
  const path = join(dirname(top), `${basename(top)}-${branch.replace(/[^\w.-]+/g, "-")}`);
  if (existsSync(path)) return path;
  const exists = await git("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`).then(
    () => true,
    () => false,
  );
  await (exists ? git("worktree", "add", path, branch) : git("worktree", "add", "-b", branch, path));
  return path;
}

/** Local branches of the repo `dir` is in, most recently committed first. Empty when it is not a repo. */
export async function listBranches(dir: string): Promise<string[]> {
  try {
    const { stdout } = await run(
      "git",
      ["-C", dir, "for-each-ref", "--sort=-committerdate", "--format=%(refname:short)", "refs/heads"],
      { env: ENV },
    );
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
