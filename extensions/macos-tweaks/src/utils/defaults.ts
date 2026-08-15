import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import type { TweakDefinition, TweakState, TweakType, TweakValue } from "../types";

const execFileAsync = promisify(execFile);

function coerceDefault(result: string, expectedType?: TweakType): TweakValue | undefined {
  // Empty or multiline results (dicts/arrays) → treat as unreadable
  if (result === "" || result.includes("\n")) return undefined;

  // If we expect a number or enum with numeric values, parse as number first
  if (expectedType === "number" || expectedType === "enum") {
    const num = Number(result);
    if (!isNaN(num)) return num;
    // Could be a string enum value like "genie", "scale", etc.
    return result;
  }

  // For booleans, handle the various representations macOS uses
  if (expectedType === "boolean") {
    if (result === "1" || result === "true" || result === "YES") return true;
    if (result === "0" || result === "false" || result === "NO") return false;
    return undefined;
  }

  return result;
}

/**
 * Async read — used for batch reads (avoids blocking the Raycast UI).
 */
export async function readDefaultAsync(
  domain: string,
  key: string,
  expectedType?: TweakType,
): Promise<TweakValue | undefined> {
  try {
    const { stdout } = await execFileAsync("defaults", ["read", domain, key], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return coerceDefault(stdout.trim(), expectedType);
  } catch {
    return undefined;
  }
}

/**
 * Write a value to macOS defaults using execFileSync (no shell injection).
 */
export function writeDefault(domain: string, key: string, value: TweakValue): void {
  let typeFlag: string;
  let valueStr: string;

  if (typeof value === "boolean") {
    typeFlag = "-bool";
    valueStr = value ? "true" : "false";
  } else if (typeof value === "number") {
    typeFlag = Number.isInteger(value) ? "-int" : "-float";
    valueStr = String(value);
  } else {
    typeFlag = "-string";
    valueStr = String(value);
  }

  execFileSync("defaults", ["write", domain, key, typeFlag, valueStr], {
    timeout: 5000,
  });
}

/**
 * Delete a key from macOS defaults, reverting to system default.
 */
export function deleteDefault(domain: string, key: string): void {
  try {
    execFileSync("defaults", ["delete", domain, key], {
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Key didn't exist — already at default
  }
}

/**
 * Restart a process by name (e.g., "Finder", "Dock", "SystemUIServer").
 */
export function restartProcess(processName: string): void {
  try {
    execFileSync("killall", [processName], {
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Process might not be running
  }
}

/**
 * Compute the correct extra value based on the primary value direction.
 * When the primary is at its default, extras are deleted (reverts to macOS defaults).
 * When the primary is "enabled", extras use their configured value.
 * When toggled off, boolean extras are inverted; other types are deleted.
 */
function computeExtraValue(
  extraValue: TweakValue,
  primaryValue: TweakValue,
  primaryDefault: TweakValue,
): TweakValue | undefined {
  // Normalize comparison (matches isModified logic) — avoids string/number mismatch edge cases
  const isEnabling = String(primaryValue) !== String(primaryDefault);
  if (isEnabling) {
    return extraValue;
  }
  // When disabling, invert booleans. For non-boolean extras (numbers/strings)
  // we can't guess the system default, so we signal the caller to delete the key
  // (which reverts to the macOS default) by returning undefined.
  if (typeof extraValue === "boolean") {
    return !extraValue;
  }
  return undefined;
}

/**
 * Apply a tweak: write the value and any extra defaults, then restart if needed.
 */
export function applyTweak(tweak: TweakDefinition, value: TweakValue): void {
  writeDefault(tweak.domain, tweak.key, value);

  if (tweak.extraDefaults) {
    for (const extra of tweak.extraDefaults) {
      if (extra.mirrorPrimary) {
        // Mirror the primary value (used when both keys must stay in sync)
        writeDefault(extra.domain, extra.key, value);
        continue;
      }
      const extraVal = computeExtraValue(extra.value, value, tweak.defaultValue);
      if (extraVal === undefined) {
        deleteDefault(extra.domain, extra.key);
      } else {
        writeDefault(extra.domain, extra.key, extraVal);
      }
    }
  }

  if (tweak.requiresRestart) {
    restartProcess(tweak.requiresRestart);
  }
}

/**
 * Reset a tweak to its default value by deleting the key(s).
 */
export function resetTweak(tweak: TweakDefinition): void {
  deleteDefault(tweak.domain, tweak.key);

  if (tweak.extraDefaults) {
    for (const extra of tweak.extraDefaults) {
      deleteDefault(extra.domain, extra.key);
    }
  }

  if (tweak.requiresRestart) {
    restartProcess(tweak.requiresRestart);
  }
}

/**
 * Determine if a value differs from the tweak's default.
 * Normalizes both sides to avoid type mismatch (string "0.5" vs number 0.5).
 */
function isModified(currentValue: TweakValue | undefined, defaultValue: TweakValue): boolean {
  if (currentValue === undefined) return false;
  return String(currentValue) !== String(defaultValue);
}

/**
 * Read the current state of a single tweak definition.
 * Use getAllTweakStates() for batch reads.
 */
export async function getTweakStateAsync(tweak: TweakDefinition): Promise<TweakState> {
  const currentValue = await readDefaultAsync(tweak.domain, tweak.key, tweak.type);
  return {
    ...tweak,
    currentValue: currentValue ?? tweak.defaultValue,
    isModified: isModified(currentValue, tweak.defaultValue),
  };
}

/**
 * Load all tweak states in chunks to avoid spawning too many subprocesses at once.
 * With ~72 tweaks a single Promise.all is fast on modern Macs, but chunking keeps
 * the process table small on constrained machines.
 */
const CHUNK_SIZE = 20;

export async function getAllTweakStates(tweaks: readonly TweakDefinition[]): Promise<TweakState[]> {
  const results: TweakState[] = [];
  for (let i = 0; i < tweaks.length; i += CHUNK_SIZE) {
    const chunk = tweaks.slice(i, i + CHUNK_SIZE);
    results.push(...(await Promise.all(chunk.map((t) => getTweakStateAsync(t)))));
  }
  return results;
}

/**
 * Get the `defaults write` command string for a tweak value (for clipboard copy).
 */
export function getCommandString(tweak: TweakDefinition, value: TweakValue): string {
  const quotedDomain = quoteArg(tweak.domain);
  const quotedKey = quoteArg(tweak.key);

  let typeFlag: string;
  let valueStr: string;

  if (typeof value === "boolean") {
    typeFlag = "-bool";
    valueStr = value ? "true" : "false";
  } else if (typeof value === "number") {
    typeFlag = Number.isInteger(value) ? "-int" : "-float";
    valueStr = String(value);
  } else {
    typeFlag = "-string";
    valueStr = quoteArg(String(value));
  }

  return `defaults write ${quotedDomain} ${quotedKey} ${typeFlag} ${valueStr}`;
}

/**
 * Get the `defaults delete` command string (for clipboard copy).
 */
export function getResetCommandString(tweak: TweakDefinition): string {
  return `defaults delete ${quoteArg(tweak.domain)} ${quoteArg(tweak.key)}`;
}

/**
 * Quote a shell argument if it contains spaces or special characters.
 * Used only for clipboard-copy commands, not for actual execution.
 */
function quoteArg(arg: string): string {
  if (/^[a-zA-Z0-9._/-]+$/.test(arg)) return arg;
  // Single-quote wrap: robust against $, backticks, backslashes.
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
