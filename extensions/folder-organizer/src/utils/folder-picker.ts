import { execFile } from "child_process";

export function pickFolder(prompt: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const escapedPrompt = prompt.replaceAll('"', '\\"');
    const script = `
      set chosenFolder to choose folder with prompt "${escapedPrompt}"
      set folderPath to POSIX path of chosenFolder
      return folderPath
    `;

    execFile("osascript", ["-e", script], (error, stdout, stderr) => {
      if (error) {
        if (error.message.includes("User canceled")) {
          resolve(null);
        } else {
          reject(new Error(stderr || error.message));
        }
        return;
      }

      resolve(stdout.trim());
    });
  });
}
