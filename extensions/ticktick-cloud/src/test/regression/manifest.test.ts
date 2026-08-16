import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MANIFEST_PATH = resolve(__dirname, "../../../package.json");
const INVALID_MANIFEST_MESSAGE = "TickTick package manifest contract is invalid.";
const EXPECTED_COMMANDS = Object.freeze([
  Object.freeze({ name: "index", mode: "view" }),
  Object.freeze({ name: "next7Days", mode: "view" }),
  Object.freeze({ name: "inbox", mode: "view" }),
  Object.freeze({ name: "search", mode: "view" }),
  Object.freeze({ name: "create", mode: "view" }),
  Object.freeze({ name: "quickAdd", mode: "no-view" }),
] as const);

type ManifestContract = Readonly<{
  author: "raycast.swimwear444";
  license: "MIT";
  categories: readonly ["Productivity"];
  platforms: readonly ["Windows"];
  commands: typeof EXPECTED_COMMANDS;
}>;

function parseManifest(raw: unknown): ManifestContract {
  if (typeof raw !== "string") throw invalidManifest();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalidManifest();
  }
  return snapshotManifest(parsed);
}

function snapshotManifest(value: unknown): ManifestContract {
  try {
    if (!isRecord(value)) throw invalidManifest();
    if (readDataProperty(value, "author") !== "raycast.swimwear444") throw invalidManifest();
    if (readDataProperty(value, "license") !== "MIT") throw invalidManifest();

    const categories = exactStringArray(readDataProperty(value, "categories"), ["Productivity"]);
    const platforms = exactStringArray(readDataProperty(value, "platforms"), ["Windows"]);
    const commandSource = readDataProperty(value, "commands");
    if (!Array.isArray(commandSource) || arrayLength(commandSource) !== EXPECTED_COMMANDS.length) {
      throw invalidManifest();
    }

    const commands = EXPECTED_COMMANDS.map((expected, index) => {
      const command = readArrayDataProperty(commandSource, index);
      if (!isRecord(command)) throw invalidManifest();
      const name = readDataProperty(command, "name");
      const mode = readDataProperty(command, "mode");
      if (name !== expected.name || mode !== expected.mode) throw invalidManifest();
      return expected;
    });
    if (new Set(commands.map(({ name }) => name)).size !== EXPECTED_COMMANDS.length) throw invalidManifest();

    return Object.freeze({
      author: "raycast.swimwear444",
      license: "MIT",
      categories: categories as readonly ["Productivity"],
      platforms: platforms as readonly ["Windows"],
      commands: Object.freeze(commands) as unknown as typeof EXPECTED_COMMANDS,
    });
  } catch {
    throw invalidManifest();
  }
}

function exactStringArray(value: unknown, expected: readonly string[]): readonly string[] {
  if (!Array.isArray(value) || arrayLength(value) !== expected.length) throw invalidManifest();
  const snapshot: string[] = [];
  for (let index = 0; index < expected.length; index += 1) {
    const entry = readArrayDataProperty(value, index);
    if (entry !== expected[index]) throw invalidManifest();
    snapshot.push(entry);
  }
  return Object.freeze(snapshot);
}

function arrayLength(value: unknown[]): number {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "number") {
    throw invalidManifest();
  }
  return descriptor.value;
}

function readArrayDataProperty(value: unknown[], index: number): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
  if (descriptor === undefined || !("value" in descriptor)) throw invalidManifest();
  return descriptor.value;
}

function readDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor)) throw invalidManifest();
  return descriptor.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidManifest(): Error {
  return new Error(INVALID_MANIFEST_MESSAGE);
}

function validFixture(): Record<string, unknown> {
  return {
    author: "raycast.swimwear444",
    license: "MIT",
    categories: ["Productivity"],
    platforms: ["Windows"],
    commands: EXPECTED_COMMANDS.map((command) => ({ ...command })),
  };
}

describe("TickTick extension manifest regression", () => {
  it("parses the real package manifest as inert JSON and preserves its exact store contract", () => {
    const contract = parseManifest(readFileSync(MANIFEST_PATH, "utf8"));

    expect(contract).toEqual({
      author: "raycast.swimwear444",
      license: "MIT",
      categories: ["Productivity"],
      platforms: ["Windows"],
      commands: EXPECTED_COMMANDS,
    });
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.commands)).toBe(true);
  });

  it("fails closed with fixed safe output for malformed JSON and unexpected root shapes", () => {
    for (const raw of ["", "{", "null", "[]", "42", "true"]) {
      expect(() => parseManifest(raw)).toThrowError(INVALID_MANIFEST_MESSAGE);
    }
    expect(() => parseManifest(Object.freeze({ private: "marker" }))).toThrowError(INVALID_MANIFEST_MESSAGE);
  });

  it("rejects hostile accessors without exposing their values or failures", () => {
    const hostile = validFixture();
    Object.defineProperty(hostile, "commands", {
      get() {
        throw new Error("PRIVATE accessor failure");
      },
    });

    expect(() => snapshotManifest(hostile)).toThrowError(INVALID_MANIFEST_MESSAGE);
  });

  it("rejects array accessors without invoking them", () => {
    let reads = 0;
    const categories: unknown[] = [];
    Object.defineProperty(categories, "0", {
      enumerable: true,
      get() {
        reads += 1;
        return "Productivity";
      },
    });
    categories.length = 1;

    expect(() => snapshotManifest({ ...validFixture(), categories })).toThrowError(INVALID_MANIFEST_MESSAGE);
    expect(reads).toBe(0);
  });

  it("rejects command duplicates, extras, omissions, and reordered values", () => {
    const exact = EXPECTED_COMMANDS.map((command) => ({ ...command }));
    const variants = [
      exact.slice(0, -1),
      [...exact, { name: "extra", mode: "view" }],
      [exact[0], exact[0], ...exact.slice(2)],
      [exact[1], exact[0], ...exact.slice(2)],
      [...exact.slice(0, 4), exact[5], exact[4]],
    ];

    for (const commands of variants) {
      expect(() => snapshotManifest({ ...validFixture(), commands })).toThrowError(INVALID_MANIFEST_MESSAGE);
    }
  });

  it("rejects changed, reordered, omitted, or extra category and platform values", () => {
    for (const categories of [[], ["Productivity", "Utilities"], ["Utilities"]]) {
      expect(() => snapshotManifest({ ...validFixture(), categories })).toThrowError(INVALID_MANIFEST_MESSAGE);
    }
    for (const platforms of [[], ["Windows", "macOS"], ["macOS"], ["macOS", "Windows"], ["Windows", "Linux"]]) {
      expect(() => snapshotManifest({ ...validFixture(), platforms })).toThrowError(INVALID_MANIFEST_MESSAGE);
    }
  });
});
