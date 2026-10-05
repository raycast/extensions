import { opendir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { PROJECT_ARTIFACT_NAMES } from "./path-safety";

const PIN_FILES = new Set([".node-version", ".nvmrc", "rust-toolchain", "rust-toolchain.toml"]);
const SKIPPED_DIRECTORIES = new Set([".git", ".hg", ".svn", "Library", ...PROJECT_ARTIFACT_NAMES]);
const MAX_DEPTH = 8;

export interface RuntimePins {
  node: Map<string, string[]>;
  rust: Map<string, string[]>;
}

function addPin(target: Map<string, string[]>, version: string, source: string): void {
  const normalized = version.trim();
  if (!normalized) return;
  target.set(normalized, [...(target.get(normalized) ?? []), source]);
}

function parseRustPin(contents: string, filename: string): string | undefined {
  if (filename === "rust-toolchain.toml") return /^\s*channel\s*=\s*["']([^"']+)["']/m.exec(contents)?.[1];
  return contents.trim().split(/\s+/)[0];
}

export async function scanRuntimePins(projectRoots: string[], signal?: AbortSignal): Promise<RuntimePins> {
  const pins: RuntimePins = { node: new Map(), rust: new Map() };

  async function visit(directoryPath: string, depth: number): Promise<void> {
    signal?.throwIfAborted();
    if (depth > MAX_DEPTH) return;
    const directory = await opendir(directoryPath);
    for await (const entry of directory) {
      signal?.throwIfAborted();
      const child = path.join(directoryPath, entry.name);
      if (entry.isFile() && PIN_FILES.has(entry.name)) {
        const contents = await readFile(child, "utf8");
        if (entry.name === ".node-version" || entry.name === ".nvmrc") addPin(pins.node, contents.trim(), child);
        else {
          const version = parseRustPin(contents, entry.name);
          if (version) addPin(pins.rust, version, child);
        }
        continue;
      }
      if (
        !entry.isDirectory() ||
        entry.isSymbolicLink() ||
        SKIPPED_DIRECTORIES.has(entry.name) ||
        entry.name.startsWith(".")
      )
        continue;
      await visit(child, depth + 1);
    }
  }

  for (const root of projectRoots) {
    try {
      await visit(await realpath(root), 0);
    } catch (error) {
      signal?.throwIfAborted();
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return pins;
}

export function matchingPinSources(pins: Map<string, string[]>, version: string): string[] {
  const normalized = version.replace(/^v/, "");
  return [...pins.entries()]
    .filter(([pin]) => {
      const normalizedPin = pin.replace(/^v/, "");
      return (
        normalized === normalizedPin ||
        normalized.startsWith(`${normalizedPin}.`) ||
        normalized.startsWith(`${normalizedPin}-`)
      );
    })
    .flatMap(([, sources]) => sources);
}
