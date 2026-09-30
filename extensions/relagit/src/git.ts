import { exec } from "child_process";
import { existsSync } from "fs";

const paths = ["/usr/local/bin/git", "/usr/bin/git", "/bin/git", "/opt/homebrew/bin/git"];

export const gitPath = paths.find((path) => {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
});

export const git = async (command: string, args: string[], cwd: string) => {
  if (!gitPath) {
    throw new Error("Git not found");
  }

  return new Promise<string>((resolve, reject) => {
    exec(`${gitPath} ${command} ${args.join(" ")}`, { cwd }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};
