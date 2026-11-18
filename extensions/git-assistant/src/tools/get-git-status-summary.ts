import { exec } from "child_process";

/**
 * Input for the get-git-status-summary tool.
 * Identifies the repository whose high-level status should be summarized.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
};

type GitStatusSummary = {
  path: string;
  branch: string | null;
  ahead: number;
  behind: number;
  hasUnstagedChanges: boolean;
  hasStagedChanges: boolean;
  hasUntrackedFiles: boolean;
  totalChangedFiles: number;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
};

/**
 * Return a summarized view of the repository status based on `git status -sb` and porcelain output.
 * Includes branch, ahead/behind counts and whether there are staged, unstaged or untracked changes.
 */
export default async function (input: Input): Promise<GitStatusSummary> {
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

    Promise.all([run("git status -sb"), run("git status --porcelain")])
      .then(([shortStatus, porcelain]) => {
        const lines = shortStatus.split("\n").filter(Boolean);
        const header = lines[0] || "";
        let branch: string | null = null;
        let ahead = 0;
        let behind = 0;

        if (header.startsWith("## ")) {
          const rest = header.slice(3);
          const matchAheadBehind = rest.match(/\[(.+)\]$/);
          let branchPart = rest;

          if (matchAheadBehind && typeof matchAheadBehind.index === "number") {
            branchPart = rest.slice(0, matchAheadBehind.index).trim();
            const summary = matchAheadBehind[1];
            const aheadMatch = summary.match(/ahead (\d+)/);
            const behindMatch = summary.match(/behind (\d+)/);

            if (aheadMatch) {
              const value = parseInt(aheadMatch[1], 10);
              if (!Number.isNaN(value)) {
                ahead = value;
              }
            }

            if (behindMatch) {
              const value = parseInt(behindMatch[1], 10);
              if (!Number.isNaN(value)) {
                behind = value;
              }
            }
          }

          const branchName = branchPart.split("...")[0].trim();
          branch = branchName || null;
        }

        const stagedFiles: string[] = [];
        const unstagedFiles: string[] = [];
        const untrackedFiles: string[] = [];

        const porcelainLines = porcelain.split("\n").filter(Boolean);

        for (const line of porcelainLines) {
          if (line.length < 3) {
            continue;
          }

          const stagedStatus = line[0];
          const unstagedStatus = line[1];
          const file = line.slice(3).trim();

          if (stagedStatus === "?" && unstagedStatus === "?") {
            untrackedFiles.push(file);
            continue;
          }

          if (stagedStatus !== " " && stagedStatus !== "?") {
            stagedFiles.push(file);
          }

          if (unstagedStatus !== " " && unstagedStatus !== "?") {
            unstagedFiles.push(file);
          }
        }

        const hasStagedChanges = stagedFiles.length > 0;
        const hasUnstagedChanges = unstagedFiles.length > 0;
        const hasUntrackedFiles = untrackedFiles.length > 0;

        resolve({
          path: input.path,
          branch,
          ahead,
          behind,
          hasUnstagedChanges,
          hasStagedChanges,
          hasUntrackedFiles,
          totalChangedFiles: stagedFiles.length + unstagedFiles.length + untrackedFiles.length,
          stagedFiles,
          unstagedFiles,
          untrackedFiles,
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
