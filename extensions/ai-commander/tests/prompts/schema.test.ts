import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  migrate,
  parsePersistedState,
  serializeState,
  validateModelRef,
  validatePromptDef,
  validateTextSnippet,
  type Migration,
} from "../../src/prompts/schema";

const prompt = { id: "p1", name: "Name", template: "{selection}" };

describe("validatePromptDef", () => {
  it("fills optional settings with defaults", () => {
    expect(validatePromptDef(prompt)).toEqual({
      ok: true,
      value: {
        ...prompt,
        reasoning: "default",
        creativity: "default",
        tags: [],
        output: "preview",
        highlightChanges: false,
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
      },
    });
  });

  it("reports every problem with its path", () => {
    const result = validatePromptDef(
      { id: 1, name: "", output: "sidebar", tags: [1], model: { provider: "x" } },
      "p[0]",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "p[0].model.provider",
      "p[0].id",
      "p[0].name",
      "p[0].template",
      "p[0].tags",
      "p[0].output",
    ]);
  });

  it("rejects non-objects", () => {
    for (const value of [null, 1, "x", []]) expect(validatePromptDef(value).ok).toBe(false);
  });

  it("keeps unknown fields only on request", () => {
    const raw = { ...prompt, futureField: 1 };
    const kept = validatePromptDef(raw, "p", { keepUnknown: true });
    expect(kept.ok && "futureField" in kept.value).toBe(true);
    const dropped = validatePromptDef(raw);
    expect(dropped.ok && "futureField" in dropped.value).toBe(false);
  });
});

describe("other validators", () => {
  it("validates model references", () => {
    expect(validateModelRef({ provider: "gemini", modelId: "m" }).ok).toBe(true);
    expect(validateModelRef({ provider: "gemini", modelId: "" }).ok).toBe(false);
    expect(validateModelRef({ provider: "other", modelId: "m" }).ok).toBe(false);
  });

  it("validates snippets and allows empty text", () => {
    expect(validateTextSnippet({ id: "s", name: "n", text: "" }).ok).toBe(true);
    expect(validateTextSnippet({ id: "s", name: "n" }).ok).toBe(false);
    expect(validateTextSnippet({ id: "s", name: "n", text: 1 }).ok).toBe(false);
  });
});

describe("migrate", () => {
  it("passes current documents through", () => {
    const document = { schemaVersion: CURRENT_SCHEMA_VERSION };
    expect(migrate(document)).toEqual({
      ok: true,
      document,
      fromVersion: CURRENT_SCHEMA_VERSION,
      isFuture: false,
    });
  });

  it("treats a document without version as version 0", () => {
    const result = migrate({ prompts: [] });
    expect(result).toMatchObject({
      ok: true,
      fromVersion: 0,
      document: { schemaVersion: CURRENT_SCHEMA_VERSION, prompts: [], seededExamples: [] },
    });
  });

  it("runs steps in order up to the target", () => {
    const steps: Record<number, Migration> = {
      1: (document) => ({ ...document, trail: "a" }),
      2: (document) => ({ ...document, trail: `${String(document.trail)}b` }),
    };
    expect(migrate({ schemaVersion: 1 }, steps, 3)).toMatchObject({
      ok: true,
      document: { schemaVersion: 3, trail: "ab" },
    });
  });

  it("reports a missing or failing step", () => {
    expect(migrate({ schemaVersion: 1 }, {}, 2)).toMatchObject({ ok: false });
    const failing: Record<number, Migration> = {
      1: () => {
        throw new Error("boom");
      },
    };
    expect(migrate({ schemaVersion: 1 }, failing, 2)).toMatchObject({ ok: false });
  });

  it("replaces the pre-release examples when leaving version 1", () => {
    const result = migrate({
      schemaVersion: 1,
      examplesSeeded: true,
      prompts: [{ id: "example-summarize", name: "Edited" }, { id: "mine" }, "unreadable"],
    });
    expect(result).toMatchObject({
      ok: true,
      document: { schemaVersion: 2, seededExamples: [], prompts: [{ id: "mine" }, "unreadable"] },
    });
    expect(result.ok && result.document).not.toHaveProperty("examplesSeeded");
  });

  it("marks documents from newer builds", () => {
    expect(migrate({ schemaVersion: 99 })).toMatchObject({ ok: true, isFuture: true });
  });

  it("rejects invalid input", () => {
    for (const value of [null, [], "x", { schemaVersion: "1" }, { schemaVersion: -1 }]) {
      expect(migrate(value).ok).toBe(false);
    }
  });
});

describe("parsePersistedState", () => {
  it("rejects a broken top-level shape", () => {
    expect(parsePersistedState({ prompts: {} })).toBeUndefined();
  });

  it("reports invalid entries and writes them back", () => {
    const bad = { id: "bad", output: "sidebar" };
    const parsed = parsePersistedState({ schemaVersion: 1, prompts: [prompt, bad, prompt] });
    expect(parsed?.state.prompts.map((entry) => entry.id)).toEqual(["p1"]);
    expect(parsed?.issues.length).toBeGreaterThanOrEqual(2);
    if (!parsed) return;
    expect(JSON.parse(serializeState(parsed)).prompts).toHaveLength(3);
  });

  it("defaults OpenRouter privacy to strict", () => {
    expect(parsePersistedState({})?.state.openRouterPrivacy.mode).toBe("strict");
  });

  it("drops a bad optional setting with a report", () => {
    const parsed = parsePersistedState({ defaultModel: { ref: { provider: "x" } }, favorites: [{}] });
    expect(parsed?.state.defaultModel).toBeUndefined();
    expect(parsed?.state.favorites).toEqual([]);
    expect(parsed?.issues.length).toBe(2);
  });

  it("keeps unknown fields at both levels", () => {
    const parsed = parsePersistedState({ schemaVersion: 7, futureRoot: 1, prompts: [{ ...prompt, futureField: 2 }] });
    if (!parsed) throw new Error("Expected a parsed state");
    const written = JSON.parse(serializeState(parsed));
    expect(written).toMatchObject({ schemaVersion: 7, futureRoot: 1 });
    expect(written.prompts[0].futureField).toBe(2);
  });
});
