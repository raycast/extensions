import { environment, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "node:path";
import { glob } from "glob";

export function* eachHex(id: string) {
  for (let i = 0; i < id.length; i += 6) yield id.slice(i, i + 6).toUpperCase();
}

export function hexToRgb(hex: string) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

const basePath = environment.supportPath + "/palette";

export async function clearCache(ignoreFiles: string[]) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clearing cache files...",
  });

  // console.log(ignoreFiles)
  const files = glob.sync(path.join(basePath, "*.svg"), {
    ignore: ignoreFiles,
  });
  files.forEach((f) => fs.rmSync(f, { force: true }));

  toast.style = Toast.Style.Success;
  toast.title = "Cache files cleared";
}

export async function calculateFiles() {
  const files = fs.readdirSync(basePath, {
    withFileTypes: true,
    recursive: false,
  });

  let totalBytes = 0;
  let count = 0;
  files
    .filter((f) => f.isFile() && f.name.endsWith(".svg"))
    .forEach((f) => {
      count++;
      totalBytes += fs.statSync(f.path).size;
    });
  return `${count} cache files(~${(totalBytes / 1_048_576).toFixed(2)} MB)`;
}
