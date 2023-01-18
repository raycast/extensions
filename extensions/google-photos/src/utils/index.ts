import { homedir } from "os";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { writeFile } from "fs/promises";

export const downloadMedia = async (url: string, filename: string, mimeType: string) => {
  const type = mimeType.split("/")[0];
  const path = join(homedir(), "Downloads", filename);

  showToast(Toast.Style.Animated, `Downloading ${type}...`);

  switch (type) {
    case "image":
      await fetch(`${url}=d`)
        .then((res) => res.arrayBuffer())
        .then((buffer) => writeFile(path, Buffer.from(buffer)));
      break;
    case "video":
      await fetch(`${url}=dv`)
        .then((res) => res.arrayBuffer())
        .then((buffer) => writeFile(path, Buffer.from(buffer)));
      break;
    default:
      showToast(Toast.Style.Failure, `Unable to download ${type}`);
  }

  showToast(Toast.Style.Success, `Downloaded ${filename}`);
};

export const isEmpty = (obj: unknown) => {
  return Object.keys(obj as { [key: string]: unknown }).length === 0;
};
