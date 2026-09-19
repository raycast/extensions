import { environment } from "@raycast/api";
import fs from "node:fs";
import type { BlipState } from "./client";

const DEMO_FILE = "/tmp/blip-send-demo.json";

/** Development only: when a fixture file exists, views render it instead of talking to Blip. Used for store screenshots. */
export function demoState(): BlipState | undefined {
  if (!environment.isDevelopment || !fs.existsSync(DEMO_FILE)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(DEMO_FILE, "utf8")) as BlipState;
  } catch {
    return undefined;
  }
}
