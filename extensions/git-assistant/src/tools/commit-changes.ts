import { exec } from "child_process";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The commit message to use
   */
  message: string;
  /**
   * The repository path (required)
   */
  path: string;
  /**
   * Whether to stage all changes before committing
   */
  stageAll: boolean;
};

/**
 * Creates a git commit with the provided message.
 * Requires path and isGitRepo to be provided from get-current-directory tool first.
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    // Helper function to execute git commands
    const execGit = (command: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        exec(command, { cwd: input.path }, (error, stdout, stderr) => {
          if (error) {
            reject(stderr.trim() || error.message);
          } else {
            resolve(stdout.trim());
          }
        });
      });
    };

    const createCommit = () => {
      execGit(`git commit -m "${input.message.replace(/"/g, '\\"')}"`)
        .then((output) => {
          resolve({
            success: true,
            message: output,
            path: input.path,
          });
        })
        .catch((error) => reject(`Failed to commit: ${error}`));
    };

    if (input.stageAll) {
      execGit("git add .")
        .then(createCommit)
        .catch((error) => reject(`Failed to stage changes: ${error}`));
    } else {
      createCommit();
    }
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Get list of files to be committed
  const getAffectedFiles = async (): Promise<string[]> => {
    return new Promise((resolve) => {
      if (input.stageAll) {
        // If staging all, show all changes including untracked files
        exec("git status --porcelain", { cwd: input.path }, (_, stdout) => {
          const files = stdout
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
              const staged = line[0];
              const unstaged = line[1];
              const file = line.slice(3).trim();
              // Handle partially staged files first
              if (staged === "M" && unstaged === "M") {
                return `⚡️ ${file} (partially staged)`;
              }
              // Then handle other status combinations
              if (staged !== " " && staged !== "?") {
                switch (staged) {
                  case "M":
                    return `📝 ${file} (modified)`;
                  case "A":
                    return `✨ ${file} (added)`;
                  case "D":
                    return `🗑️  ${file} (deleted)`;
                  case "R":
                    return `📋 ${file} (renamed)`;
                  default:
                    return `• ${file}`;
                }
              } else if (unstaged === "?") {
                return `❓ ${file} (untracked)`;
              } else if (unstaged !== " ") {
                switch (unstaged) {
                  case "M":
                    return `📝 ${file} (modified)`;
                  case "D":
                    return `🗑️  ${file} (deleted)`;
                  default:
                    return `• ${file}`;
                }
              }
              return `• ${file}`;
            });
          resolve(files);
        });
      } else {
        // Otherwise, show only staged files
        exec("git diff --cached --name-status", { cwd: input.path }, (_, stdout) => {
          const files = stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const [status, file] = line.split("\t");
              // Add status indicator
              switch (status.trim()) {
                case "M":
                  return `📝 ${file} (modified)`;
                case "A":
                  return `✨ ${file} (added)`;
                case "D":
                  return `🗑️  ${file} (deleted)`;
                case "R":
                  return `📋 ${file} (renamed)`;
                default:
                  return `• ${file}`;
              }
            });
          resolve(files);
        });
      }
    });
  };

  const affectedFiles = await getAffectedFiles();
  const filesList = affectedFiles.map((file) => `  ${file}`).join("\n");

  return {
    message:
      "Do you want to create the following Git commit?\n\n" +
      "📄 Files to be committed:\n" +
      `${filesList}\n\n` +
      "💬 Commit Message:\n" +
      input.message
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
    info: [{ name: "Repository", value: input.path }],
  };
};
