// Menu Command Bar v01

import { execFile } from "node:child_process";
import { environment } from "@raycast/api";
import { promisify } from "node:util";
import path from "node:path";
import type { MenuListing } from "./types";

const execFileP = promisify(execFile);

function helperPath(): string {
  return path.join(environment.assetsPath, "menubar-helper");
}

export async function listMenuItems(): Promise<MenuListing> {
  const { stdout } = await execFileP(helperPath(), ["list"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout) as MenuListing;
}

export async function invokeMenuItem(
  bundleId: string,
  itemPath: string[],
): Promise<void> {
  const encoded = Buffer.from(JSON.stringify(itemPath), "utf8").toString(
    "base64",
  );
  await execFileP(helperPath(), ["invoke", bundleId, encoded]);
}
