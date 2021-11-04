import { environment, showToast, ToastStyle } from "@raycast/api";
import { join as path_join } from "path";
import { mkdirSync } from "fs";
import { stat, readFile, writeFile } from "fs/promises";
import fetch from "node-fetch";

/// Utils

export const supportPath = (() => {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
  } catch (err) {
    console.log('Failed to create supportPath');
  }
  return environment.supportPath;
})();

export function cachePath(path: string): string {
  return path_join(supportPath, path);
}

export interface Remote<T> {
  url: string;
  cachePath: string;
  value?: T[];
}

export async function fetchRemote<T>(remote: Remote<T>): Promise<T[]> {
  if (remote.value) { return remote.value; }

  async function readCache(): Promise<T[] | undefined> {
    const cacheTime = (await stat(remote.cachePath)).mtimeMs;
    const response = await fetch(remote.url, {method: "HEAD"});
    const lastModified = Date.parse(response.headers.get('last-modified') ?? "");

    if (!isNaN(lastModified) && lastModified < cacheTime) {
      const cacheBuffer = await readFile(remote.cachePath);
      remote.value = JSON.parse(cacheBuffer.toString());
      return remote.value;
    } else {
      throw 'Invalid cache';
    }
  }

  async function fetchURL(): Promise<T[] | undefined> {
    const response = await fetch(remote.url);
    remote.value = await response.json();
    try {
      await writeFile(remote.cachePath, JSON.stringify(remote.value));
    } catch (err) {
      console.error("Failed to write formula cache:", err)
    }
    return remote.value;
  }

  let value;
  try {
    value = await readCache();
  } catch {
    value = await fetchURL();
  }
  return (value ? [...value] : []);
}

/// Toast

export function showFailureToast(title: string, error: any) {
  const msg = error['stderr']?.trim() ?? '';
  showToast(ToastStyle.Failure, title, msg);
}

/// Array

declare global {
  interface Array<T> {
    totalLength?: number;
    first(): T | undefined;
    last(): T | undefined;
    isTruncated(): boolean;
  }
}

if (!Array.prototype.first) {
  Array.prototype.first = function<T>(this: T[]): T | undefined {
    return (this.length > 0 ? this[0] : undefined);
  }
}

if (!Array.prototype.last) {
  Array.prototype.last = function<T>(this: T[]): T | undefined {
    return (this.length > 0 ? this[this.length - 1] : undefined);
  }
}

if (!Array.prototype.isTruncated) {
  Array.prototype.isTruncated = function<T>(this: T[]): boolean {
    if (this.totalLength) {
      return this.length < this.totalLength;
    }
    return false;
  }
}
