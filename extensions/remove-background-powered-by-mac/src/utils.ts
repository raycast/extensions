import { environment } from "@raycast/api";
import { exec } from "child_process";
import { chmod, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let _tempFilePath: string;

export function getTempFilePath(): string {
  if (_tempFilePath) {
    return _tempFilePath;
  }

  const tempDir = tmpdir();
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  _tempFilePath = join(tempDir, `remove-bg-${uniqueSuffix}.png`);

  return _tempFilePath;
}

export async function storeClipboardImageAsTemporaryFile(imageUrl: string) {
  try {
    const sourcePath = decodeURI(imageUrl.replace("file://", ""));
    const imageData = await readFile(sourcePath);

    const tempFilePath = getTempFilePath();

    await writeFile(tempFilePath, imageData);

    return tempFilePath;
  } catch (error) {
    console.error("Error copying image file:", error);

    throw error;
  }
}

export async function runBackgroundRemoval({ paths }: { paths: string[] }) {
  const command = join(environment.assetsPath, "remove-background");
  await chmod(command, "755");
  const output = await new Promise<string>((resolve, reject) => {
    exec(`${command} ${paths.map((x) => JSON.stringify(x)).join(" ")}`, (err, stdout, stderr) => {
      if (err) {
        // get stdout
        reject(stdout + " " + stderr);
      }
      resolve(stdout);
    });
  });

  return output;
}
