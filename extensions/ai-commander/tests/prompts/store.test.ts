import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExamplePrompts } from "../../src/prompts/examples";
import {
  BACKUP_KEY,
  QUARANTINE_KEY,
  STORAGE_KEY,
  StoreCorruptedError,
  StoreError,
  applyImport,
  createPrompt,
  createSnippet,
  deletePrompt,
  deleteSnippet,
  duplicatePrompt,
  exportAll,
  getDefaultModel,
  getFavorites,
  getLoadIssues,
  getOpenRouterPrivacy,
  getPrompt,
  getPrompts,
  getSnippets,
  markPromptUsed,
  raycastIconKey,
  resetStore,
  restoreBackup,
  setDefaultModel,
  setOpenRouterPrivacy,
  toggleFavorite,
  updatePrompt,
  updateSnippet,
  type PromptDraft,
} from "../../src/prompts/store";
import { CURRENT_SCHEMA_VERSION } from "../../src/prompts/schema";
import { render } from "../../src/prompts/template/render";
import { validatePromptDraft } from "../../src/prompts/template/validate";
import { parseImport, planImport } from "../../src/prompts/transfer";

// The shared stand-in has no `Icon`, and only this suite needs it.
vi.mock("@raycast/api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Icon: { Globe: "globe-01-16", BulletPoints: "bullet-points-16" },
}));

const draft: PromptDraft = {
  name: "Test",
  template: "{selection}",
  reasoning: "default",
  creativity: "default",
  tags: [],
  output: "preview",
  highlightChanges: false,
  enabled: true,
};

const EXAMPLE_IDS = createExamplePrompts(0).map((prompt) => prompt.id);
/** A current document that already received every example, so loading it adds none. */
const SEEDED = { schemaVersion: CURRENT_SCHEMA_VERSION, seededExamples: EXAMPLE_IDS };

async function stored(): Promise<Record<string, unknown>> {
  return JSON.parse((await LocalStorage.getItem<string>(STORAGE_KEY)) ?? "{}");
}

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("seeding", () => {
  it("creates the five examples on first run", async () => {
    const prompts = await getPrompts();
    expect(prompts.map((prompt) => prompt.id)).toEqual([
      "example-simplify",
      "example-translate-en",
      "example-summarize",
      "example-reply-email",
      "example-action-items",
    ]);
    expect((await stored()).seededExamples).toEqual(EXAMPLE_IDS);
  });

  it("does not bring deleted examples back", async () => {
    await deletePrompt("example-simplify");
    expect(await getPrompt("example-simplify")).toBeUndefined();
    expect(await getPrompts()).toHaveLength(4);
  });

  it("adds an example from a later version once", async () => {
    const earlier = EXAMPLE_IDS.filter((id) => id !== "example-action-items");
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...SEEDED, seededExamples: earlier, prompts: [] }));
    expect((await getPrompts()).map((prompt) => prompt.id)).toEqual(["example-action-items"]);
    await deletePrompt("example-action-items");
    expect(await getPrompts()).toEqual([]);
  });

  it("keeps a prompt that already has an example's ID", async () => {
    const mine = { id: "example-simplify", name: "Mine", template: "x" };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...SEEDED, seededExamples: [], prompts: [mine] }));
    const prompts = await getPrompts();
    expect(prompts).toHaveLength(5);
    expect(prompts[0]?.name).toBe("Mine");
  });

  it("replaces the examples of pre-release data and keeps the user's prompts", async () => {
    await LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        examplesSeeded: true,
        prompts: [
          { id: "example-simplify", name: "Edited", template: "Old {selection}" },
          { id: "mine", name: "Mine", template: "{selection}" },
        ],
      }),
    );
    const prompts = await getPrompts();
    expect(prompts.map((prompt) => prompt.id)).toEqual(["mine", ...EXAMPLE_IDS]);
    const simplify = prompts.find((prompt) => prompt.id === "example-simplify");
    expect(simplify).toEqual(createExamplePrompts(simplify?.createdAt ?? 0)[0]);
    expect(await stored()).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, seededExamples: EXAMPLE_IDS });
    expect(await stored()).not.toHaveProperty("examplesSeeded");
  });
});

describe("examples", () => {
  it("keep their defined settings", () => {
    const examples = createExamplePrompts(5);
    expect(
      examples.map(({ name, icon, output, highlightChanges, creativity }) => ({
        name,
        icon,
        output,
        highlightChanges,
        creativity,
      })),
    ).toEqual([
      { name: "Simplify", icon: "Wand", output: "preview", highlightChanges: true, creativity: "low" },
      { name: "Translate to English", icon: "Globe", output: "replace", highlightChanges: false, creativity: "low" },
      { name: "Summarize", icon: "BulletPoints", output: "preview", highlightChanges: false, creativity: "low" },
      { name: "Reply to Email", icon: "Envelope", output: "preview", highlightChanges: false, creativity: "medium" },
      {
        name: "Extract Action Items",
        icon: "CheckCircle",
        output: "insertAfter",
        highlightChanges: false,
        creativity: "none",
      },
    ]);
    for (const example of examples) {
      expect(example).toMatchObject({ reasoning: "default", enabled: true, createdAt: 5 });
      expect(example.model).toBeUndefined();
    }
  });

  it("pass the checks of the prompt form without hints", () => {
    for (const example of createExamplePrompts(5)) {
      expect(validatePromptDraft(example)).toEqual({ ok: true, errors: [], hints: [] });
    }
  });

  it("read naturally once filled in", () => {
    const [, , , reply, actionItems] = createExamplePrompts(5);
    const email = render(reply?.template ?? "", {
      clipboard: { 0: "  Can we meet on Friday?  " },
      arguments: { tone: "formal", points: "" },
    });
    expect(email).toContain("Tone: formal. No subject line, no signature.");
    expect(email).toContain('"""\nCan we meet on Friday?\n"""');

    const notes = render(actionItems?.template ?? "", {
      selection: "Anna sends the slides",
      now: new Date(2026, 10, 3),
    });
    expect(notes).toContain("Today is Tuesday, November 3, 2026.");
  });
});

describe("prompts", () => {
  it("creates, reads, updates and deletes", async () => {
    const created = await createPrompt(draft);
    expect(await getPrompt(created.id)).toEqual(created);

    const updated = await updatePrompt(created.id, { name: "Renamed", model: undefined });
    expect(updated).toMatchObject({ id: created.id, name: "Renamed" });
    expect((await getPrompt(created.id))?.name).toBe("Renamed");

    await deletePrompt(created.id);
    expect(await getPrompt(created.id)).toBeUndefined();
  });

  it("cannot change an ID", async () => {
    const created = await createPrompt(draft);
    const patch = { id: "other" } as Partial<PromptDraft>;
    expect((await updatePrompt(created.id, patch)).id).toBe(created.id);
  });

  it("fails on a missing prompt", async () => {
    await expect(updatePrompt("nope", { name: "x" })).rejects.toThrow(StoreError);
    await expect(duplicatePrompt("nope")).rejects.toThrow("Prompt Not Found");
  });

  it("duplicates with a new ID and without usage", async () => {
    const created = await createPrompt(draft);
    await markPromptUsed(created.id, 123);
    const copy = await duplicatePrompt(created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toBe("Test Copy");
    expect(copy.lastUsedAt).toBeUndefined();
  });

  it("marks usage and ignores deleted prompts", async () => {
    await markPromptUsed("example-summarize", 42);
    expect((await getPrompt("example-summarize"))?.lastUsedAt).toBe(42);
    await expect(markPromptUsed("gone")).resolves.toBeUndefined();
  });

  it("does not lose concurrent updates", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) => createPrompt({ ...draft, name: `Prompt ${index}` })),
    );
    expect(new Set(results.map((prompt) => prompt.id)).size).toBe(20);
    expect(await getPrompts()).toHaveLength(20 + EXAMPLE_IDS.length);
  });

  it("keeps working after a failed operation", async () => {
    await expect(updatePrompt("nope", {})).rejects.toThrow();
    await expect(createPrompt(draft)).resolves.toBeDefined();
  });
});

describe("snippets", () => {
  it("supports CRUD", async () => {
    const snippet = await createSnippet({ name: "Sign", text: "Bye" });
    expect((await updateSnippet(snippet.id, { text: "Ciao" })).text).toBe("Ciao");
    expect(await getSnippets()).toHaveLength(1);
    await deleteSnippet(snippet.id);
    expect(await getSnippets()).toEqual([]);
  });

  it("keeps names unique", async () => {
    const first = await createSnippet({ name: "A", text: "" });
    const second = await createSnippet({ name: "B", text: "" });
    await expect(createSnippet({ name: "A", text: "" })).rejects.toThrow(StoreError);
    await expect(updateSnippet(second.id, { name: "A" })).rejects.toThrow(StoreError);
    await expect(updateSnippet(first.id, { name: "A" })).resolves.toBeDefined();
  });
});

describe("settings", () => {
  const model = { provider: "anthropic", modelId: "m" } as const;

  it("stores the default model", async () => {
    expect(await getDefaultModel()).toBeUndefined();
    await setDefaultModel({ ref: model, reasoning: "low" });
    expect(await getDefaultModel()).toEqual({ ref: model, reasoning: "low" });
    await setDefaultModel(undefined);
    expect(await getDefaultModel()).toBeUndefined();
  });

  it("toggles favorites", async () => {
    expect(await toggleFavorite(model)).toBe(true);
    expect(await getFavorites()).toEqual([model]);
    expect(await toggleFavorite(model)).toBe(false);
    expect(await getFavorites()).toEqual([]);
  });

  it("defaults OpenRouter privacy to strict", async () => {
    expect(await getOpenRouterPrivacy()).toEqual({ mode: "strict", ignoreProviders: [] });
    await setOpenRouterPrivacy({ mode: "standard", ignoreProviders: ["deepseek"] });
    expect((await getOpenRouterPrivacy()).mode).toBe("standard");
  });
});

describe("corrupted data", () => {
  it("quarantines broken JSON and never overwrites it", async () => {
    await LocalStorage.setItem(STORAGE_KEY, "{broken");
    await expect(getPrompts()).rejects.toThrow(StoreCorruptedError);
    await expect(createPrompt(draft)).rejects.toThrow(StoreCorruptedError);
    expect(await LocalStorage.getItem(STORAGE_KEY)).toBe("{broken");
    expect(await LocalStorage.getItem(QUARANTINE_KEY)).toBe("{broken");
  });

  it("treats a wrong top-level shape the same way", async () => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ prompts: "nope" }));
    await expect(getPrompts()).rejects.toThrow(StoreCorruptedError);
  });

  it("restores the previous good document", async () => {
    const created = await createPrompt(draft);
    await markPromptUsed(created.id, 1);
    await LocalStorage.setItem(STORAGE_KEY, "{broken");

    const error = await getPrompts().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(StoreCorruptedError);
    expect((error as StoreCorruptedError).hasBackup).toBe(true);

    await restoreBackup();
    expect(await getPrompt(created.id)).toBeDefined();
  });

  it("reports when there is no backup", async () => {
    await LocalStorage.setItem(STORAGE_KEY, "{broken");
    const error = await getPrompts().catch((reason: unknown) => reason);
    expect((error as StoreCorruptedError).hasBackup).toBe(false);
    await expect(restoreBackup()).rejects.toThrow(StoreError);
  });

  it("resets on request and keeps the quarantined copy", async () => {
    await LocalStorage.setItem(STORAGE_KEY, "{broken");
    await getPrompts().catch(() => undefined);
    await resetStore();
    expect(await getPrompts()).toEqual([]);
    expect(await LocalStorage.getItem(QUARANTINE_KEY)).toBe("{broken");
  });

  it("keeps a backup of the previous document on every write", async () => {
    await getPrompts();
    const before = await LocalStorage.getItem<string>(STORAGE_KEY);
    await createPrompt(draft);
    expect(await LocalStorage.getItem(BACKUP_KEY)).toBe(before);
  });

  it("keeps and reports invalid entries through writes", async () => {
    const invalid = { id: "x", name: "n", template: "t", output: "sidebar" };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ ...SEEDED, prompts: [invalid] }));
    expect(await getPrompts()).toEqual([]);
    expect(getLoadIssues()[0]?.path).toBe("prompts[0].output");

    await createPrompt(draft);
    expect(await getPrompts()).toHaveLength(1);
    expect((await stored()).prompts).toEqual(expect.arrayContaining([invalid]));
  });

  it("keeps the version and fields of a document from a newer build", async () => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, futureRoot: true }));
    await createPrompt(draft);
    expect(await stored()).toMatchObject({ schemaVersion: 99, futureRoot: true });
    // A newer build manages its own examples.
    expect((await stored()).prompts).toHaveLength(1);
  });
});

describe("transfer", () => {
  it("exports without unknown fields", async () => {
    const unknownField = { apiKey: "value-that-must-not-leak" };
    await LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...SEEDED,
        prompts: [{ id: "a", name: "A", template: "{selection}", ...unknownField }],
      }),
    );
    const document = await exportAll();
    expect(document.prompts).toHaveLength(1);
    expect(JSON.stringify(document)).not.toContain("value-that-must-not-leak");
  });

  it("applies a plan against fresh data", async () => {
    const created = await createPrompt(draft);
    const document = await exportAll();
    await updatePrompt(created.id, { name: "Changed" });

    const parsed = parseImport(JSON.stringify(document));
    const plan = planImport(parsed, { prompts: await getPrompts(), snippets: [] });
    const summary = await applyImport(plan, { resolve: "overwrite" });
    expect(summary.overwritten).toBe(6);
    expect((await getPrompt(created.id))?.name).toBe("Test");
    expect(await getPrompts()).toHaveLength(6);
  });

  it("applies settings only on request", async () => {
    const document = await exportAll();
    document.settings.openRouterPrivacy = { mode: "standard", ignoreProviders: [] };
    const plan = planImport(parseImport(JSON.stringify(document)), { prompts: [], snippets: [] });
    await applyImport(plan, { resolve: "skip" });
    expect((await getOpenRouterPrivacy()).mode).toBe("strict");
    await applyImport(plan, { resolve: "skip", includeSettings: true });
    expect((await getOpenRouterPrivacy()).mode).toBe("standard");
  });
});

describe("raycastIconKey", () => {
  it("maps Raycast icon names to enum keys", () => {
    expect(raycastIconKey("globe-01")).toBe("Globe");
    expect(raycastIconKey("bullet-points-16")).toBe("BulletPoints");
    expect(raycastIconKey("Globe")).toBe("Globe");
    expect(raycastIconKey("no-such-icon")).toBeUndefined();
  });
});

describe("snippet names", () => {
  it("rejects names that no placeholder could quote", async () => {
    await expect(createSnippet({ name: `It's "it"`, text: "x" })).rejects.toBeInstanceOf(StoreError);
  });
});
