import { describe, expect, it } from "vitest";
import {
  duplicateCommand,
  MAX_NAME_LENGTH,
  resetStarters,
  sortCommands,
  updateCommand,
  validateCommandFields,
} from "./operations";
import { STARTER_IDS, starterCommands } from "./starters";
import type { AiCommand, CommandFields } from "./types";

const defaults = { model: "system", creativity: "normal" } as const;
const NOW = "2026-02-01T00:00:00.000Z";

const fields: CommandFields = {
  name: "Name",
  icon: "Stars",
  prompt: "Do {selection}",
  output: "replace",
  model: "system",
  creativity: "normal",
  useCase: "general",
  guardrails: "permissive",
};

function userCommand(overrides: Partial<AiCommand> = {}): AiCommand {
  return {
    ...fields,
    id: "user-1",
    pinned: false,
    isStarter: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateCommandFields", () => {
  it("accepts valid fields", () => {
    expect(validateCommandFields(fields)).toEqual([]);
  });

  it("requires a name within the length limit", () => {
    expect(validateCommandFields({ ...fields, name: "  " })).toEqual(["Name is required"]);
    expect(validateCommandFields({ ...fields, name: "a".repeat(61) })).toEqual(["Name must be 60 characters or fewer"]);
  });

  it("requires a prompt and reports placeholder errors", () => {
    expect(validateCommandFields({ ...fields, prompt: " " })).toEqual(["Prompt is required"]);
    const prompt = ["a", "b", "c", "d"].map((name) => `{argument name="${name}"}`).join(" ");
    expect(validateCommandFields({ ...fields, prompt })).toContain("Use at most 3 arguments");
  });
});

describe("updateCommand", () => {
  it("applies the patch and bumps updatedAt only", () => {
    const updated = updateCommand(userCommand(), { pinned: true }, NOW);
    expect(updated).toMatchObject({ pinned: true, updatedAt: NOW, createdAt: "2026-01-01T00:00:00.000Z" });
  });
});

describe("duplicateCommand", () => {
  it("creates an unpinned, non-starter copy", () => {
    const copy = duplicateCommand(userCommand({ pinned: true, isStarter: true }), { id: "new", now: NOW });
    expect(copy).toMatchObject({
      id: "new",
      name: "Name Copy",
      isStarter: false,
      pinned: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("clamps long names so the copy fits the name limit", () => {
    const copy = duplicateCommand(userCommand({ name: "a".repeat(MAX_NAME_LENGTH) }), { id: "new", now: NOW });
    expect(copy.name).toHaveLength(MAX_NAME_LENGTH);
    expect(copy.name.endsWith(" Copy")).toBe(true);
  });
});

describe("resetStarters", () => {
  it("restores edited and deleted starters, keeping pins and user commands", () => {
    const starters = starterCommands(NOW, defaults);
    const casual = starters.find((s) => s.id === "starter-make-casual")!;
    const edited = { ...casual, prompt: "changed", pinned: true };
    const user = userCommand();
    const current = [edited, ...starters.filter((s) => s.id !== "starter-simplify" && s.id !== casual.id), user];

    const result = resetStarters(current, starters);

    expect(result.find((c) => c.id === casual.id)).toEqual({ ...casual, pinned: true });
    expect(result.find((c) => c.id === "starter-simplify")).toEqual(starters.find((s) => s.id === "starter-simplify"));
    expect(result.find((c) => c.id === user.id)).toBe(user);
    expect(result).toHaveLength(starters.length + 1);
  });
});

describe("sortCommands", () => {
  it("puts pinned first then sorts by name", () => {
    const sorted = sortCommands([
      userCommand({ id: "1", name: "Beta" }),
      userCommand({ id: "2", name: "Zed", pinned: true }),
      userCommand({ id: "3", name: "Alpha" }),
    ]);
    expect(sorted.map((c) => c.name)).toEqual(["Zed", "Alpha", "Beta"]);
  });
});

describe("starterCommands", () => {
  it("provides valid starters with stable ids", () => {
    const starters = starterCommands(NOW, defaults);
    expect(starters).toHaveLength(11);
    for (const starter of starters) {
      expect(STARTER_IDS).toContain(starter.id);
      expect(validateCommandFields(starter)).toEqual([]);
    }
    expect(starters.map((s) => s.name)).toContain("Explain Simply");
  });
});
