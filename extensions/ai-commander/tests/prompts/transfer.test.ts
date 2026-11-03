import { describe, expect, it } from "vitest";
import type { PromptDef, TextSnippet } from "../../src/core/types";
import { CURRENT_SCHEMA_VERSION } from "../../src/prompts/schema";
import {
  EXPORT_FORMAT,
  ImportError,
  applyImportPlan,
  buildExport,
  mapRaycastModel,
  parseImport,
  planImport,
  serializeExport,
  type TransferSettings,
} from "../../src/prompts/transfer";

const prompt: PromptDef = {
  id: "p1",
  name: "Prompt",
  template: "{selection}",
  reasoning: "default",
  creativity: "low",
  tags: ["a"],
  output: "preview",
  highlightChanges: false,
  enabled: true,
  createdAt: 1,
  updatedAt: 2,
};
const snippet: TextSnippet = { id: "s1", name: "Sign", text: "Bye", updatedAt: 3 };
const settings: TransferSettings = { favorites: [], openRouterPrivacy: { mode: "strict", ignoreProviders: [] } };
const input = { prompts: [prompt], snippets: [snippet], ...settings };

describe("export", () => {
  it("carries the version and all sections", () => {
    const document = buildExport(
      { ...input, defaultModel: { ref: { provider: "openai", modelId: "m" }, reasoning: "off" } },
      9,
    );
    expect(document).toMatchObject({
      format: EXPORT_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: 9,
      prompts: [prompt],
      snippets: [snippet],
      settings: { defaultModel: { reasoning: "off" }, openRouterPrivacy: { mode: "strict" } },
    });
  });

  it("drops anything outside the schema", () => {
    const leaky = { ...prompt, apiKey: "test-placeholder-key" };
    const text = serializeExport(
      buildExport({
        ...input,
        prompts: [leaky],
        openRouterPrivacy: { ...settings.openRouterPrivacy, token: "x" } as never,
      }),
    );
    expect(text).not.toContain("test-placeholder-key");
    expect(text).not.toContain("token");
    expect(text.toLowerCase()).not.toMatch(/apikey/);
  });

  it("round-trips", () => {
    const text = serializeExport(buildExport(input));
    expect(parseImport(text)).toMatchObject({
      source: "ai-commander",
      prompts: [prompt],
      snippets: [snippet],
      settings: { favorites: [] },
      issues: [],
    });
  });
});

describe("parseImport", () => {
  it("rejects unusable files", () => {
    for (const text of ["not json", "42", "null", '{"foo": 1}', '{"schemaVersion": 1}']) {
      expect(() => parseImport(text), text).toThrow(ImportError);
    }
    expect(() => parseImport('{"format":"ai-commander-export","schemaVersion":"x"}')).toThrow(ImportError);
    expect(() => parseImport(`[${"{},".repeat(5001)}{}]`)).toThrow(ImportError);
  });

  it("accepts a byte order mark", () => {
    expect(parseImport(`${String.fromCharCode(0xfeff)}[]`).source).toBe("raycast");
  });

  it("reports bad entries and imports the rest", () => {
    const document = { format: EXPORT_FORMAT, schemaVersion: 1, prompts: [prompt, { id: 1 }, prompt], snippets: [{}] };
    const parsed = parseImport(JSON.stringify(document));
    expect(parsed.prompts).toHaveLength(1);
    expect(parsed.issues.filter((issue) => issue.severity === "skipped").length).toBeGreaterThanOrEqual(3);
  });

  it("drops unknown fields and survives __proto__", () => {
    const text = `{"format":"${EXPORT_FORMAT}","schemaVersion":1,"prompts":[{"id":"a","name":"n","template":"{selection}","extra":1,"__proto__":{"polluted":true}}]}`;
    const parsed = parseImport(text);
    expect(parsed.prompts[0]).not.toHaveProperty("extra");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("warns about templates that would not run", () => {
    const document = buildExport({ ...input, prompts: [{ ...prompt, template: "no input" }] });
    expect(parseImport(JSON.stringify(document)).issues).toEqual([
      expect.objectContaining({ severity: "warning", path: 'prompt "p1".template' }),
    ]);
  });

  it("warns about files from newer versions", () => {
    const document = { ...buildExport(input), schemaVersion: 99 };
    expect(parseImport(JSON.stringify(document)).issues[0]?.path).toBe("schemaVersion");
  });
});

describe("Raycast import", () => {
  // Same shape as ray.so's "copy JSON" output.
  const entry = {
    title: "Improve Writing",
    prompt: "Fix this text.\n\nText: {selection}\n\nFixed:",
    creativity: "low",
    icon: "pencil",
    model: "openai-gpt-5.6-luna",
  };

  it("maps the known fields", () => {
    const parsed = parseImport(JSON.stringify([entry]), { now: 7, resolveIcon: () => "Pencil" });
    expect(parsed.source).toBe("raycast");
    expect(parsed.prompts[0]).toMatchObject({
      name: "Improve Writing",
      icon: "Pencil",
      template: entry.prompt,
      creativity: "low",
      reasoning: "default",
      output: "preview",
      enabled: true,
      createdAt: 7,
      tags: [],
    });
  });

  it("accepts a single object", () => {
    expect(parseImport(JSON.stringify(entry)).prompts).toHaveLength(1);
  });

  it("uses the default model when a model is unknown", () => {
    const parsed = parseImport(JSON.stringify([entry]));
    expect(parsed.prompts[0]?.model).toBeUndefined();
    expect(parsed.issues).toEqual([expect.objectContaining({ path: "commands[0].model", severity: "warning" })]);
  });

  it("keeps a model the catalog knows", () => {
    const knownModels = [{ provider: "openai", modelId: "gpt-5.6-luna" }] as const;
    const parsed = parseImport(JSON.stringify([entry]), { knownModels });
    expect(parsed.prompts[0]?.model).toEqual(knownModels[0]);
    expect(parsed.issues).toEqual([]);
  });

  it("maps model prefixes conservatively", () => {
    const known = [
      { provider: "anthropic", modelId: "claude-sonnet-4-6" },
      { provider: "gemini", modelId: "gemini-3.8-flash" },
      { provider: "openrouter", modelId: "mistral-large" },
    ] as const;
    expect(mapRaycastModel("anthropic-claude-sonnet-4-6-reasoning", known)?.modelId).toBe("claude-sonnet-4-6");
    expect(mapRaycastModel('"google-gemini-3.8-flash"', known)?.provider).toBe("gemini");
    expect(mapRaycastModel("mistral-mistral-large", known)).toBeUndefined();
    expect(mapRaycastModel(undefined, known)).toBeUndefined();
    expect(mapRaycastModel(5, known)).toBeUndefined();
  });

  it("falls back on bad creativity and missing icons", () => {
    const parsed = parseImport(JSON.stringify([{ ...entry, creativity: "wild", icon: 3 }]));
    expect(parsed.prompts[0]?.creativity).toBe("default");
    expect(parsed.prompts[0]).not.toHaveProperty("icon");
  });

  it("disables prompts that have no input placeholder", () => {
    const parsed = parseImport(JSON.stringify([{ title: "Poem", prompt: "Write a {argument name=mood} poem." }]));
    expect(parsed.prompts[0]?.enabled).toBe(false);
    expect(parsed.issues.some((issue) => issue.path === "commands[0].prompt")).toBe(true);
  });

  it("maps highlightEdits only with a selection", () => {
    const withSelection = parseImport(JSON.stringify([{ ...entry, highlightEdits: true }]));
    expect(withSelection.prompts[0]?.highlightChanges).toBe(true);
    const without = parseImport(JSON.stringify([{ title: "T", prompt: "{clipboard}", highlightEdits: true }]));
    expect(without.prompts[0]?.highlightChanges).toBe(false);
  });

  it("skips entries without title or prompt", () => {
    const parsed = parseImport(JSON.stringify([{ title: "x" }, { prompt: "y" }, 1, { title: "", prompt: "z" }]));
    expect(parsed.prompts).toEqual([]);
    expect(parsed.issues).toHaveLength(4);
  });

  it("derives stable IDs, so a repeated import conflicts", () => {
    const text = JSON.stringify([entry]);
    const first = parseImport(text);
    expect(first.prompts[0]?.id).toBe(parseImport(text).prompts[0]?.id);
    expect(planImport(first, { prompts: first.prompts, snippets: [] }).conflicts).toHaveLength(1);
  });

  it("reports duplicates within one file", () => {
    const parsed = parseImport(JSON.stringify([entry, entry]));
    expect(parsed.prompts).toHaveLength(1);
    expect(parsed.issues.some((issue) => issue.message.includes("duplicates"))).toBe(true);
  });
});

describe("conflict handling", () => {
  const incoming: PromptDef = { ...prompt, name: "Incoming", template: "{clipboard}", lastUsedAt: 99 };
  const existing: PromptDef = { ...prompt, createdAt: 10, lastUsedAt: 20 };
  const parsed = { source: "ai-commander" as const, prompts: [incoming], snippets: [], issues: [] };
  const current = { prompts: [existing], snippets: [] };
  const options = { now: 50, generateId: () => "new-id" };

  it("finds conflicts by prompt ID", () => {
    const plan = planImport(parsed, current);
    expect(plan.conflicts).toHaveLength(1);
    expect(planImport({ ...parsed, prompts: [{ ...incoming, id: "other" }] }, current).conflicts).toEqual([]);
  });

  it("finds snippet conflicts by ID or name", () => {
    const target = { prompts: [], snippets: [snippet] };
    const byName = { ...parsed, prompts: [], snippets: [{ ...snippet, id: "other" }] };
    const byId = { ...parsed, prompts: [], snippets: [{ ...snippet, name: "Other" }] };
    expect(planImport(byName, target).conflicts).toHaveLength(1);
    expect(planImport(byId, target).conflicts).toHaveLength(1);
  });

  it("overwrites but keeps ID, creation date and usage", () => {
    const outcome = applyImportPlan(planImport(parsed, current), current, { ...options, resolve: "overwrite" });
    expect(outcome.prompts).toEqual([{ ...incoming, id: "p1", createdAt: 10, updatedAt: 50, lastUsedAt: 20 }]);
    expect(outcome.summary.overwritten).toBe(1);
  });

  it("copies under a new ID and name", () => {
    const outcome = applyImportPlan(planImport(parsed, current), current, { ...options, resolve: "copy" });
    expect(outcome.prompts).toHaveLength(2);
    expect(outcome.prompts[1]).toMatchObject({ id: "new-id", name: "Incoming Copy", createdAt: 50 });
    expect(outcome.prompts[1]?.lastUsedAt).toBeUndefined();
  });

  it("numbers repeated copies", () => {
    const target = { prompts: [existing, { ...existing, id: "x", name: "Incoming Copy" }], snippets: [] };
    const outcome = applyImportPlan(planImport(parsed, target), target, { ...options, resolve: "copy" });
    expect(outcome.prompts[2]?.name).toBe("Incoming Copy 2");
  });

  it("skips", () => {
    const outcome = applyImportPlan(planImport(parsed, current), current, { ...options, resolve: "skip" });
    expect(outcome.prompts).toEqual([existing]);
    expect(outcome.summary).toEqual({ added: 0, overwritten: 0, copied: 0, skipped: 1 });
  });

  it("adds entries without conflict", () => {
    const target = { prompts: [], snippets: [] };
    const outcome = applyImportPlan(planImport(parsed, target), target, { ...options, resolve: "skip" });
    expect(outcome.prompts).toEqual([incoming]);
    expect(outcome.summary.added).toBe(1);
  });

  it("decides per entry", () => {
    const withSnippet = { ...parsed, snippets: [snippet] };
    const target = { prompts: [existing], snippets: [snippet] };
    const outcome = applyImportPlan(planImport(withSnippet, target), target, {
      ...options,
      resolve: (entry) => (entry.kind === "prompt" ? "skip" : "copy"),
    });
    expect(outcome.summary).toEqual({ added: 0, overwritten: 0, copied: 1, skipped: 1 });
    expect(outcome.snippets[1]).toMatchObject({ id: "new-id", name: "Sign Copy" });
  });

  it("overwrites snippets but keeps their ID", () => {
    const withSnippet = { ...parsed, prompts: [], snippets: [{ ...snippet, id: "other", text: "New" }] };
    const target = { prompts: [], snippets: [snippet] };
    const outcome = applyImportPlan(planImport(withSnippet, target), target, { ...options, resolve: "overwrite" });
    expect(outcome.snippets).toEqual([{ ...snippet, text: "New", updatedAt: 50 }]);
  });

  it("matches snippets by name first, so names stay unique", () => {
    const local = [snippet, { id: "s2", name: "Other", text: "Two", updatedAt: 3 }];
    const file = { ...parsed, prompts: [], snippets: [{ id: "s1", name: "Other", text: "New", updatedAt: 4 }] };
    const target = { prompts: [], snippets: local };
    const outcome = applyImportPlan(planImport(file, target), target, { ...options, resolve: "overwrite" });
    expect(outcome.snippets.map((entry) => entry.name)).toEqual(["Sign", "Other"]);
    expect(outcome.snippets[1]).toMatchObject({ id: "s2", text: "New" });
  });

  it("points imported prompts at snippets kept as copies", () => {
    const usesSign = { ...incoming, id: "p2", template: '{selection} {snippet name="Sign" | trim}' };
    const file = { ...parsed, prompts: [usesSign], snippets: [{ ...snippet, id: "s9", text: "Theirs" }] };
    const target = { prompts: [], snippets: [snippet] };
    const outcome = applyImportPlan(planImport(file, target), target, { ...options, resolve: "copy" });
    expect(outcome.snippets[1]?.name).toBe("Sign Copy");
    expect(outcome.prompts[0]?.template).toBe('{selection} {snippet name="Sign Copy" | trim}');
  });

  it("keeps the name of a snippet that conflicts by ID only", () => {
    const file = { ...parsed, prompts: [], snippets: [{ ...snippet, name: "Fresh" }] };
    const target = { prompts: [], snippets: [snippet] };
    const outcome = applyImportPlan(planImport(file, target), target, { ...options, resolve: "copy" });
    expect(outcome.snippets[1]).toMatchObject({ id: "new-id", name: "Fresh" });
  });

  it("does not mutate the current data", () => {
    const prompts = [existing];
    applyImportPlan(planImport(parsed, { prompts, snippets: [] }), { prompts, snippets: [] }, { resolve: "overwrite" });
    expect(prompts).toEqual([existing]);
  });

  it("returns settings only on request", () => {
    const withSettings = { ...parsed, settings: { favorites: [], openRouterPrivacy: settings.openRouterPrivacy } };
    const plan = planImport(withSettings, current);
    expect(applyImportPlan(plan, current, { resolve: "skip" }).settings).toBeUndefined();
    expect(applyImportPlan(plan, current, { resolve: "skip", includeSettings: true }).settings).toBeDefined();
  });
});
