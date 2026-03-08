import { open } from "@raycast/api";
import { execFile } from "child_process";

export async function openUrl(url: string, options?: { background?: boolean }): Promise<void> {
  if (options?.background) {
    return new Promise((resolve, reject) => {
      // execFile passes args as array — no shell interpretation, safe from injection
      execFile("open", ["-g", url], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  return open(url);
}
