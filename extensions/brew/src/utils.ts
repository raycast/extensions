import { Clipboard, environment, Toast } from "@raycast/api";
import path from "path";
import fs from "fs";
import { stat } from "fs/promises";
import fetch, { FetchError } from "node-fetch";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { filter } from "stream-json/filters/Filter";
import { streamArray } from "stream-json/streamers/StreamArray";
import { pipeline as streamPipeline } from "stream/promises";
import { ExecError } from "./brew";

/// Utils

export const supportPath: string = (() => {
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  } catch (err) {
    console.log("Failed to create supportPath");
  }
  return environment.supportPath;
})();

export const bundleIdentifier: string = (() => {
  return (
    environment.supportPath.split(path.sep).find((comp) => {
      if (comp.startsWith("com.raycast")) {
        return true;
      }
      return false;
    }) ?? "com.raycast.macos"
  );
})();

export function cachePath(name: string): string {
  return path.join(supportPath, name);
}

export interface Remote<T> {
  url: string;
  cachePath: string;
  value?: T[];
}

// Top-level object keys which should be parsed from the raw JSON objects.
const valid_keys = [
  "name",
  "tap",
  "desc",
  "homepage",
  "versions",
  "outdated",
  "caveats",
  "token",
  "version",
  "installed",
  "auto_updates",
  "depends_on",
  "conflicts_with",
  "license",
  "aliases",
  "dependencies",
  "build_dependencies",
  "installed",
  "keg_only",
  "linked_key",
  "pinned",
];

export async function fetchRemote<T>(remote: Remote<T>): Promise<T[]> {
  if (remote.value) {
    return remote.value;
  }

  async function fetchURL(): Promise<void> {
    const response = await fetch(remote.url);
    if (!response.ok) {
      throw new Error(`Invalid response ${response.statusText}`);
    }
    await streamPipeline(response.body, fs.createWriteStream(remote.cachePath));
  }

  let cacheInfo: fs.Stats | undefined;
  let lastModified = 0;

  try {
    cacheInfo = await stat(remote.cachePath);
    const response = await fetch(remote.url, { method: "HEAD" });
    lastModified = Date.parse(response.headers.get("last-modified") ?? "");
  } catch {
    console.log("Missed cache:", remote.cachePath); // keep prettier happy :-(
  }

  // We check for a minimum size in case we received some invalid cache due to a previous error
  if (!cacheInfo || cacheInfo.size < 1024 || lastModified > cacheInfo.mtimeMs) {
    await fetchURL();
  }

  const keysRe = new RegExp(`\\b(${valid_keys.join("|")})\\b`);

  // stream-json/chain is quite slow, so unfortunately not suitable for real-time queries.
  // migrating to a sqlite backend _might_ help, although the bootstrap cost
  // (each time json response changes) will probably be high.
  const pipeline = chain([fs.createReadStream(remote.cachePath), parser(), filter({ filter: keysRe }), streamArray()]);

  remote.value = [];

  return new Promise((resolve, reject) => {
    pipeline.on("data", (data) => remote.value?.push(data.value));
    pipeline.on("end", () => {
      resolve(remote.value ?? []);
    });
    pipeline.on("err", (err) => reject(err));
  });
}

/// Toast

interface ActionToastOptions {
  title: string;
  message?: string;
  cancelable: boolean;
}

export function showActionToast(actionOptions: ActionToastOptions): AbortController | undefined {
  const options: Toast.Options = {
    style: Toast.Style.Animated,
    title: actionOptions.title,
    message: actionOptions.message,
  };

  let controller: AbortController | undefined;

  if (actionOptions.cancelable) {
    controller = new AbortController();
    options.primaryAction = {
      title: "Cancel",
      onAction: () => {
        controller?.abort();
        toast.hide();
      },
    };
  }

  const toast = new Toast(options);
  toast.show();
  return controller;
}

export async function showFailureToast(title: string, error: Error): Promise<void> {
  if (error.name == "AbortError") {
    console.log("AbortError");
    return;
  }

  console.log(`${title}: ${error}`);
  const stderr = (error as ExecError).stderr ?? (error as FetchError).message ?? `${error}`;
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: title,
    message: stderr,
    primaryAction: {
      title: "Copy Error Log",
      onAction: () => {
        Clipboard.copy(stderr);
      },
    },
  };

  const toast = new Toast(options);
  await toast.show();
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
  Array.prototype.first = function <T>(this: T[]): T | undefined {
    return this.length > 0 ? this[0] : undefined;
  };
}

if (!Array.prototype.last) {
  Array.prototype.last = function <T>(this: T[]): T | undefined {
    return this.length > 0 ? this[this.length - 1] : undefined;
  };
}

if (!Array.prototype.isTruncated) {
  Array.prototype.isTruncated = function <T>(this: T[]): boolean {
    if (this.totalLength) {
      return this.length < this.totalLength;
    }
    return false;
  };
}

/// String

declare global {
  interface StringConstructor {
    ellipsis: string;
  }
}

if (!String.ellipsis) {
  String.ellipsis = "…";
}
