import { LocalStorage } from "@raycast/api";
import { File, isFile, unique } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safelyRun<F extends (...args: any[]) => any>(func: F, defaultValue: ReturnType<F>): F {
  return ((...args: Parameters<F>) => {
    try {
      return func(...args);
    } catch (err) {
      console.error(`Could not safely ${func.prototype.name ? `run ${func.prototype.name}` : "handle files"}`, err);
      return defaultValue;
    }
  }) as F;
}

function isFileArray(v: unknown): v is File[] {
  if (v == null) return false;
  return Array.isArray(v) && v.every((val) => isFile(val));
}

async function getLocalStorageFilesInternal(): Promise<File[]> {
  const stored = await LocalStorage.getItem<string>("obsidian-files");
  if (!stored) return [];

  const json = JSON.parse(stored);
  if (isFileArray(json)) {
    return json;
  } else {
    throw new Error(`Unexpected format for obsidian files in Local Storage: ${stored}`);
  }
}

async function replaceLocalStorageFilesInternal(files: File[]): Promise<void> {
  const trimmedFiles: File[] = files.map((file) => ({
    attributes: file.attributes,
    fileName: file.fileName,
    fullPath: file.fullPath,
    frontmatter: file.frontmatter,
  }));

  const json = JSON.stringify(trimmedFiles);
  await LocalStorage.setItem("obsidian-files", json);
}

async function addToLocalStorageFilesInternal(files: File[]): Promise<void> {
  const existing = await getLocalStorageFilesInternal();
  const newSet = unique([...existing, ...files]);
  await replaceLocalStorageFilesInternal(newSet);
}

export const getLocalStorageFiles = safelyRun(getLocalStorageFilesInternal, Promise.resolve([]));
export const replaceLocalStorageFiles = safelyRun(replaceLocalStorageFilesInternal, Promise.resolve(undefined));
export const addToLocalStorageFiles = safelyRun(addToLocalStorageFilesInternal, Promise.resolve(undefined));
