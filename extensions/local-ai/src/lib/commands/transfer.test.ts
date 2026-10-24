import { describe, expect, it } from "vitest";
import { ImportError, parseImport, serializeExport, type ImportContext } from "./transfer";
import type { AiCommand } from "./types";

const NOW = "2026-03-01T00:00:00.000Z";

function command(overrides: Partial<AiCommand> = {}): AiCommand {
  return {
    id: "user-1",
    name: "Fix",
    icon: "Pencil",
    prompt: "Fix {selection}",
    output: "replace",
    model: "system",
    creativity: "precise",
    useCase: "general",
    guardrails: "permissive",
    pinned: true,
    isStarter: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function context(overrides: Partial<ImportContext> = {}): ImportContext {
  let counter = 0;
  return {
    existingIds: new Set(),
    validIconNames: new Set(["Pencil", "Stars"]),
    newId: () => `new-${++counter}`,
    now: NOW,
    defaults: { model: "system", creativity: "normal" },
    ...overrides,
  };
}

describe("serializeExport", () => {
  it("omits pinned and isStarter and is pretty-printed", () => {
    const json = serializeExport([command()]);
    expect(json).toContain('\n  {\n    "id"');
    const [item] = JSON.parse(json) as Record<string, unknown>[];
    expect(item).not.toHaveProperty("pinned");
    expect(item).not.toHaveProperty("isStarter");
  });

  it("round-trips through parseImport", () => {
    const original = command();
    const { imported, skipped } = parseImport(serializeExport([original]), context());
    expect(skipped).toEqual([]);
    expect(imported).toEqual([{ ...original, pinned: false, isStarter: false, createdAt: NOW, updatedAt: NOW }]);
  });
});

describe("parseImport file checks", () => {
  it.each([
    ["not json", "The file is not valid JSON"],
    ['{"a":1}', "The file must contain a JSON array of commands"],
    [JSON.stringify(Array.from({ length: 501 }, () => ({}))), "A file can hold at most 500 commands"],
    [JSON.stringify([{ prompt: "x".repeat(1_000_001) }]), "The file is larger than 1 MB"],
  ])("rejects %#", (json, message) => {
    expect(() => parseImport(json, context())).toThrow(new ImportError(message));
  });
});

describe("parseImport items", () => {
  const item = (overrides: Record<string, unknown> = {}) => ({ ...command(), ...overrides });

  it("assigns new ids to conflicting, repeated and starter ids", () => {
    const json = JSON.stringify([
      item({ id: "taken" }),
      item({ id: "fresh" }),
      item({ id: "fresh" }),
      item({ id: "starter-fix-grammar" }),
    ]);
    const { imported } = parseImport(json, context({ existingIds: new Set(["taken"]) }));
    expect(imported.map((c) => c.id)).toEqual(["new-1", "fresh", "new-2", "new-3"]);
  });

  it("falls back to the default icon for unknown icons", () => {
    const { imported } = parseImport(JSON.stringify([item({ icon: "Nope" })]), context());
    expect(imported[0].icon).toBe("Stars");
  });

  it("skips invalid items with one reason each", () => {
    const fourArgs = ["a", "b", "c", "d"].map((n) => `{argument name="${n}"}`).join(" ");
    const json = JSON.stringify([
      item({ prompt: undefined }),
      item({ name: " " }),
      item({ id: "" }),
      item({ prompt: fourArgs }),
      "nope",
      item({ id: "ok" }),
    ]);
    const { imported, skipped } = parseImport(json, context());
    expect(imported.map((c) => c.id)).toEqual(["ok"]);
    expect(skipped).toEqual([
      { index: 0, reason: "Prompt is required" },
      { index: 1, reason: "Name is required" },
      { index: 2, reason: "Id is required" },
      { index: 3, reason: "Use at most 3 arguments" },
      { index: 4, reason: "Not a command object" },
    ]);
  });

  it("drops unknown fields", () => {
    const { imported } = parseImport(JSON.stringify([item({ extra: 1 })]), context());
    expect(imported[0]).not.toHaveProperty("extra");
  });
});
