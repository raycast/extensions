import { open } from "@raycast/api";
import * as fs from "fs";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fileExists(filename: string): Promise<boolean> {
  return fs.promises
    .access(filename, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export async function waitForFileExists(filename: string, timeoutMs = 2000) {
  const start = new Date();
  while (start.getTime() > 0) {
    await sleep(10);
    if (await fileExists(filename)) {
      return true;
    }
    const end = new Date();
    const delta = end.getTime() - start.getTime();
    if (delta > timeoutMs) {
      return false;
    }
  }
  return false;
}

export function raycastForVSCodeURI(uri: string) {
  return `vscode://tonka3000.raycast/${uri}`;
}

export async function openURIinVSCode(uri: string) {
  await open(raycastForVSCodeURI(uri));
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}
