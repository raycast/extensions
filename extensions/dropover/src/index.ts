import { FileSystemItem, getSelectedFinderItems, showHUD } from "@raycast/api";
import { spawn } from "child_process";

const spawnPromise = function (command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const process = spawn(command, args, { shell: false });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    process.on("error", reject);
  });
};

export default async function main() {
  let files: FileSystemItem[];
  try {
    files = await getSelectedFinderItems();
  } catch (error) {
    files = [];
  }

  if (files.length === 0) {
    await showHUD("No files selected");
    return;
  }

  try {
    const args = ["-b", "me.damir.dropover-mac", ...files.map((file) => file.path)];
    await spawnPromise("open", args);
    await showHUD(`📎 Added ${files.length} to Dropover`);
  } catch (e) {
    console.error(e);
    await showHUD(`📛 Failed to add files to Dropover!`);
  }
}
