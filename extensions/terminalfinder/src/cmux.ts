const WORKING_DIRECTORY_KEYS = ["cwd", "workingDirectory", "working_directory"] as const;
const FOCUSED_WORKING_DIRECTORY_KEYS = [
  "focusedCwd",
  "focused_cwd",
  "focusedWorkingDirectory",
  "focused_working_directory",
] as const;
const FOCUS_KEYS = ["focused", "active", "isFocused", "isActive", "selected", "current"] as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFirstString(record: JsonRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return undefined;
}

function findExplicitFocusedWorkingDirectory(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findExplicitFocusedWorkingDirectory(item);
      if (match) return match;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const directMatch = readFirstString(value, FOCUSED_WORKING_DIRECTORY_KEYS);
  if (directMatch) {
    return directMatch;
  }

  for (const nested of Object.values(value)) {
    const match = findExplicitFocusedWorkingDirectory(nested);
    if (match) return match;
  }

  return undefined;
}

function isFocusedRecord(record: JsonRecord): boolean {
  return FOCUS_KEYS.some((key) => record[key] === true);
}

function findWorkingDirectoryInSubtree(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findWorkingDirectoryInSubtree(item);
      if (match) return match;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const directMatch = readFirstString(value, WORKING_DIRECTORY_KEYS);
  if (directMatch) {
    return directMatch;
  }

  for (const nested of Object.values(value)) {
    const match = findWorkingDirectoryInSubtree(nested);
    if (match) return match;
  }

  return undefined;
}

function findFocusedWorkingDirectory(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFocusedWorkingDirectory(item);
      if (match) return match;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (isFocusedRecord(value)) {
    const directMatch = findWorkingDirectoryInSubtree(value);
    if (directMatch) {
      return directMatch;
    }
  }

  for (const nested of Object.values(value)) {
    const match = findFocusedWorkingDirectory(nested);
    if (match) return match;
  }

  return undefined;
}

export function extractCmuxWorkingDirectory(sidebarState: unknown): string {
  const explicitFocusedDirectory = findExplicitFocusedWorkingDirectory(sidebarState);
  if (explicitFocusedDirectory) {
    return explicitFocusedDirectory;
  }

  const focusedDirectory = findFocusedWorkingDirectory(sidebarState);
  if (focusedDirectory) {
    return focusedDirectory;
  }

  throw new Error("cmux did not return a focused workspace with a working directory");
}
