import { exec } from "child_process";

type Input = {
  /**
   * The directory path to check (optional, defaults to Finder path if available, otherwise current directory)
   */
  path?: string;
};

/**
 * Gets the current working directory and verifies if it's a git repository
 * By default, tries to get the current Finder path first
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    // If path is provided, use it directly
    if (input.path) {
      exec("git rev-parse --git-dir", { cwd: input.path }, (error, stdout) => {
        if (error) {
          reject(
            `This directory ${input.path} is not a git repository. Initialize a new repository with 'git init' first, or provide a correct path to an existing git repository.`,
          );
          return;
        }

        resolve({
          path: input.path,
          gitDir: stdout.trim(),
        });
      });
      return;
    }

    // Otherwise, try to get Finder path first
    const script = `
      tell application "Finder"
        if (count of windows) > 0 then
          get POSIX path of (target of front window as alias)
        end if
      end tell
    `;

    exec(`osascript -e '${script}'`, (_, stdout) => {
      const finderPath = stdout.trim();
      const currentDir = finderPath || process.cwd();

      // Check if it's a git repository
      exec("git rev-parse --git-dir", { cwd: currentDir }, (error, stdout) => {
        if (error) {
          reject(
            `This directory ${currentDir} is not a git repository. Initialize a new repository with 'git init' first, or provide a correct path to an existing git repository.`,
          );
          return;
        }

        resolve({
          path: currentDir,
          gitDir: stdout.trim(),
        });
      });
    });
  });
}
