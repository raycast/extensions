import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { VessloData } from "../types";

const DATA_PATH = join(homedir(), ".vesslo", "data.json");

export function loadVessloData(): VessloData | null {
  try {
    if (!existsSync(DATA_PATH)) {
      return null;
    }
    const content = readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(content) as VessloData;
  } catch (error) {
    console.error("Failed to load Vesslo data:", error);
    return null;
  }
}

export function isVessloRunning(): boolean {
  // Check if data file exists and is recent (within 24 hours)
  try {
    if (!existsSync(DATA_PATH)) {
      return false;
    }
    const data = loadVessloData();
    if (!data) return false;

    const exportedAt = new Date(data.exportedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - exportedAt.getTime()) / (1000 * 60 * 60);

    return hoursDiff < 24;
  } catch {
    return false;
  }
}
