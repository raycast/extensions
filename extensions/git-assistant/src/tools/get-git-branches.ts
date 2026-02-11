import { exec } from "child_process";

/**
 * Input for the get-git-branches tool.
 * Controls which branches are listed for the repository.
 */
type Input = {
  /**
   * Absolute path to the Git repository whose branches should be listed.
   */
  path: string;
  /**
   * When true, also include remote branches in the result in addition to local branches.
   */
  includeRemote?: boolean;
  /**
   * Optional branch type filter. When provided, controls which branches are queried:
   * "local", "remote", or "all". If omitted, local branches are always listed and
   * remote branches are included only when includeRemote is true.
   */
  branchType?: "local" | "remote" | "all";
  /**
   * Optional commit SHA or revision that listed branches must contain.
   */
  contains?: string;
  /**
   * Optional commit SHA or revision that listed branches must NOT contain.
   */
  notContains?: string;
};

type GitBranches = {
  path: string;
  currentBranch: string | null;
  localBranches: string[];
  remoteBranches: string[];
};

/**
 * List branches in the given Git repository.
 * Returns the current branch, local branches, and optionally remote branches.
 */
export default async function (input: Input): Promise<GitBranches> {
  return new Promise((resolve, reject) => {
    const run = (command: string): Promise<string> => {
      return new Promise((resolveCommand, rejectCommand) => {
        exec(command, { cwd: input.path }, (error, stdout, stderr) => {
          if (error) {
            rejectCommand(stderr.trim() || error.message);
          } else {
            resolveCommand(stdout.trim());
          }
        });
      });
    };

    const includeRemote = Boolean(input.includeRemote);
    const branchType = input.branchType;
    const wantLocal = branchType ? branchType === "local" || branchType === "all" : true;
    const wantRemote = branchType ? branchType === "remote" || branchType === "all" : includeRemote;

    const filterArgs: string[] = [];
    if (input.contains) {
      filterArgs.push(`--contains ${input.contains}`);
    }
    if (input.notContains) {
      filterArgs.push(`--no-contains ${input.notContains}`);
    }
    const filtersPart = filterArgs.length ? " " + filterArgs.join(" ") : "";

    const commands: Promise<string>[] = [run("git branch --show-current")];
    if (wantLocal) {
      commands.push(run(`git branch --list${filtersPart}`));
    } else {
      commands.push(Promise.resolve(""));
    }
    if (wantRemote) {
      commands.push(run(`git branch -r${filtersPart}`));
    }

    Promise.all(commands)
      .then((results) => {
        const [current, localList, remoteList = ""] = results;

        const currentBranch = current.trim() || null;
        const localBranches = localList
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => (line.startsWith("* ") ? line.slice(2).trim() : line));

        const remoteBranches = includeRemote
          ? remoteList
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          : [];

        resolve({
          path: input.path,
          currentBranch,
          localBranches,
          remoteBranches,
        });
      })
      .catch((error) => {
        if (typeof error === "string") {
          reject(error);
        } else {
          reject(String(error));
        }
      });
  });
}
