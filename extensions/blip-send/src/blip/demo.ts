import { environment } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isWindows } from "../platform";
import type { BlipState } from "./client";

// The Mac keeps its fixed /tmp path, which is what the screenshot workflow writes to.
// os.tmpdir() there resolves to a per-user /var/folders directory instead.
const DEMO_FILE = isWindows ? path.join(os.tmpdir(), "blip-send-demo.json") : "/tmp/blip-send-demo.json";

/** Development only: when a fixture file exists, views render it instead of talking to Blip. Used for store screenshots. */
export function demoState(): BlipState | undefined {
  if (!environment.isDevelopment || !fs.existsSync(DEMO_FILE)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(DEMO_FILE, "utf8")) as BlipState;
  } catch {
    return undefined;
  }
}
