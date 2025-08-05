import { mkdir, stat, writeFile as writeFilePromise } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

import { environment } from "@raycast/api";

export const ensureDir = async (path: string) => {
  try {
    const t = await stat(path);
    if (!t.isDirectory()) {
      throw new Error(`Path is not a directory: ${path}`);
    }
  } catch {
    await mkdir(path, {
      recursive: true,
    });
  }
};

export const fileExists = async (path: string) => {
  try {
    const st = await stat(path);
    return st.isFile();
  } catch {
    return false;
  }
};

export const soundPath = (filename?: string) => {
  return filename ? `${environment.supportPath}/sounds/${filename}` : `${environment.supportPath}/sounds`;
};

export const getFileName = (soundUrl: string) => {
  const parsed = url.parse(soundUrl);
  const filename = parsed.pathname ? path.basename(parsed.pathname) : null;
  return filename;
};

export const writeFile = async (fileName: string, buffer: ArrayBuffer) => {
  const filePath = soundPath(fileName);
  return writeFilePromise(filePath, Buffer.from(buffer));
};
