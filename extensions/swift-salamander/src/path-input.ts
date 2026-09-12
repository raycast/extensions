import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function normalizeLocalPath(input: string): string {
  const value = input.trim();
  if (!value || value.includes("\n") || value.includes("\0")) {
    throw new Error("Enter one local path");
  }

  let path: string;
  if (value.startsWith("file:")) {
    const url = new URL(value);
    if (url.hostname && url.hostname !== "localhost") {
      throw new Error("Remote file URLs are unsupported");
    }
    path = fileURLToPath(url);
  } else if (value === "~") {
    path = homedir();
  } else if (value.startsWith("~/")) {
    path = resolve(homedir(), value.slice(2));
  } else {
    path = value;
  }

  if (!isAbsolute(path)) throw new Error("Enter an absolute local path");
  return path;
}
