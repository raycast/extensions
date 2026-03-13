import { LocalStorage } from "@raycast/api";
import { isStringArray } from "../types";
import tagify from "./tagify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safelyRun<F extends (...args: any[]) => any>(func: F, defaultValue: ReturnType<F>): F {
  return ((...args: Parameters<F>) => {
    try {
      return func(...args);
    } catch (err) {
      console.error(`Could not safely ${func.prototype.name ? `run ${func.prototype.name}` : "handle tags"}`, err);
      return defaultValue;
    }
  }) as F;
}

async function getLocalStorageTagsInternal(): Promise<Set<string>> {
  const stored = await LocalStorage.getItem<string>("obsidian-tags");
  if (!stored) return new Set();

  const json = JSON.parse(stored);
  if (isStringArray(json)) {
    return new Set(json);
  } else {
    throw new Error(`Unexpectd format for obsidian tags in Local Storage: ${stored}`);
  }
}

async function replaceLocalStorageTagsInternal(tags: Set<string> | string[]): Promise<void> {
  const array = [...tags].flatMap((tag) => tagify(tag));
  const json = JSON.stringify(array);
  await LocalStorage.setItem("obsidian-tags", json);
}

async function addToLocalStorageTagsInternal(tags: Set<string> | string[]): Promise<void> {
  const existing = await getLocalStorageTagsInternal();
  const slugified = [...tags].flatMap((tag) => tagify(tag));
  const newSet = new Set([...existing, ...slugified]);
  await replaceLocalStorageTagsInternal(newSet);
}

export const getLocalStorageTags = safelyRun(getLocalStorageTagsInternal, Promise.resolve(new Set<string>()));
export const replaceLocalStorageTags = safelyRun(replaceLocalStorageTagsInternal, Promise.resolve(undefined));
export const addToLocalStorageTags = safelyRun(addToLocalStorageTagsInternal, Promise.resolve(undefined));
