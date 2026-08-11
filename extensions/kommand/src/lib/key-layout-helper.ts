import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { KommandShortcut } from "./types";

const execFileAsync = promisify(execFile);
const HELPER_NAME = "kommand-keylayout-helper";

export type KeyLabelLookup = ReadonlyMap<number, string>;
type ShortcutGroup = { shortcuts: KommandShortcut[] };

function isInteger(value: number): value is number {
  return Number.isInteger(value);
}

function helperPath(): string {
  return join(environment.assetsPath, HELPER_NAME);
}

async function hasExecutableHelper(): Promise<boolean> {
  try {
    await access(helperPath(), constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function collectShortcutKeyCodes(
  shortcuts: KommandShortcut[],
): number[] {
  const uniqueCodes = new Set<number>();

  for (const shortcut of shortcuts) {
    for (const step of shortcut.steps) {
      if (step.keyCode != null && isInteger(step.keyCode)) {
        uniqueCodes.add(step.keyCode);
      }
    }
  }

  return [...uniqueCodes].sort((a, b) => a - b);
}

export function collectGroupKeyCodes(groups: ShortcutGroup[]): number[] {
  return collectShortcutKeyCodes(groups.flatMap((group) => group.shortcuts));
}

export function serializeKeyCodes(keyCodes: number[]): string {
  return keyCodes.join(",");
}

export async function translateSerializedKeyCodes(
  serializedKeyCodes: string,
): Promise<KeyLabelLookup> {
  if (!serializedKeyCodes) {
    return new Map();
  }

  const keyCodes = serializedKeyCodes.split(",").map(Number).filter(isInteger);

  if (keyCodes.length === 0 || !(await hasExecutableHelper())) {
    return new Map();
  }

  try {
    const { stdout } = await execFileAsync(helperPath(), keyCodes.map(String), {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });

    const parsed = JSON.parse(stdout) as Record<string, string>;
    const labels = new Map<number, string>();

    for (const keyCode of keyCodes) {
      const label = parsed[String(keyCode)];
      if (typeof label === "string" && label.length > 0) {
        labels.set(keyCode, label);
      }
    }

    return labels;
  } catch (error) {
    console.error("Failed to translate key codes with local helper:", error);
    return new Map();
  }
}
