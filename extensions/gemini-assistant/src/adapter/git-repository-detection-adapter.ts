import path from "node:path";
import { exec } from "node:child_process";
import * as util from "node:util";

const SEARCH_DIRS = [
  path.join(process.env.HOME ?? "", "Projects"),
  path.join(process.env.HOME ?? "", "Documents"),
  path.join(process.env.HOME ?? "", "Desktop"),
];

export type GitRepositoryWithPath = {
  repositoryName: string;
  repositoryPath: string;
};

const execPromise = util.promisify(exec);

export async function detectGitRepositories() {
  let gitRepos: GitRepositoryWithPath[] = [];

  try {
    const findCommands = SEARCH_DIRS.map((directory) =>
      execPromise(`find ${directory} -type d -name ".git" 2>/dev/null`).then(({ stdout }) => {
        return stdout
          .trim()
          .split("\n")
          .map((gitPath) => path.dirname(gitPath))
          .map((path) => path.trim())
          .filter(Boolean)
          .filter((gitPath) => path.dirname(gitPath) !== "." && path.dirname(gitPath) !== "");
      }),
    );

    const results = await Promise.all(findCommands);
    const allRepoPaths = results.flat();

    gitRepos = allRepoPaths.map((repoPath) => ({
      repositoryName: path.basename(repoPath),
      repositoryPath: repoPath,
    }));
  } catch (error) {
    console.warn("Error scanning directories for Git repositories", error);
  }

  return gitRepos;
}
