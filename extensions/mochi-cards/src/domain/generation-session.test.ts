import { describe, expect, it } from "vitest";

import {
  editMarkdown,
  editMochiValues,
  generateSession,
  generationFieldTitle,
  getAiFieldErrors,
  getGeneratedAiFields,
  getMochiFieldValues,
  isSessionReady,
  regenerateAll,
  regenerateField,
  renderMarkdown,
  restoreGenerated,
  type GenerationProgress,
} from "./generation-session";
import type { CardTemplate } from "./template";
import { trimOuterEmptyLines, type AiClient } from "./template-engine";

describe("generation session", () => {
  it("substitutes repeated and empty fields before independent AI calls", async () => {
    const prompts: string[] = [];
    const client: AiClient = {
      async ask(prompt: string): Promise<string> {
        prompts.push(prompt);
        return prompt.includes("first") ? "\n\nONE\n\n" : "TWO";
      },
    };

    const session = await generateSession(
      template("# <<word>> / <<word>> / <<context>>\n<ai>first <<word>></ai>\n<ai>second <<context>></ai>"),
      { word: "λόγος", context: "" },
      client
    );

    expect(prompts).toEqual(["first λόγος", "second "]);
    expect(renderMarkdown(session)).toBe("# λόγος / λόγος / \nONE\nTWO");
  });

  it("substitutes fields when placeholders have surrounding whitespace", async () => {
    const prompts: string[] = [];
    const session = await generateSession(
      template("# <<   word       >>\n<ai>Translate << word >></ai>"),
      { word: "λόγος" },
      {
        async ask(prompt): Promise<string> {
          prompts.push(prompt);
          return "word";
        },
      }
    );

    expect(prompts).toEqual(["Translate λόγος"]);
    expect(renderMarkdown(session)).toBe("# λόγος\nword");
  });

  it("reports creation progress", async () => {
    const progress: GenerationProgress[] = [];

    await generateSession(
      template("Before<ai>prompt</ai>After"),
      {},
      { ask: async () => "answer" },
      undefined,
      (entry) => progress.push(entry)
    );

    expect(progress).toEqual([
      { kind: "substituting-fields" },
      { kind: "generating-ai-fields", total: 1 },
      { kind: "ai-field-finished", number: 1, total: 1, succeeded: true },
      { kind: "rendering-preview" },
    ]);
  });

  it("keeps successful fields when another AI request fails", async () => {
    const client: AiClient = {
      async ask(prompt: string): Promise<string> {
        if (prompt === "bad") {
          throw new Error("Model unavailable");
        }
        return "good response";
      },
    };

    const session = await generateSession(template("<ai>good</ai>|<ai>bad</ai>"), {}, client);
    expect(renderMarkdown(session)).toBe("good response|");
    expect(getAiFieldErrors(session)).toEqual([{ id: "ai-field-2", message: "Model unavailable" }]);
    expect(isSessionReady(session)).toBe(false);
  });

  it("regenerates one field without changing the others", async () => {
    let responseNumber = 0;
    const client: AiClient = {
      async ask(): Promise<string> {
        responseNumber += 1;
        return `response-${responseNumber}`;
      },
    };
    const initial = await generateSession(template("<ai>one</ai>|<ai>two</ai>"), {}, client);
    const regenerated = await regenerateField(initial, "ai-field-2", client);

    expect(renderMarkdown(initial)).toBe("response-1|response-2");
    expect(renderMarkdown(regenerated)).toBe("response-1|response-3");
  });

  it("keeps previous responses when a full regeneration partially fails", async () => {
    const initial = await generateSession(
      template("<ai>one</ai>|<ai>two</ai>"),
      {},
      {
        ask: async (prompt) => `initial-${prompt}`,
      }
    );
    const regenerated = await regenerateAll(initial, {
      ask: async (prompt) => {
        if (prompt === "two") {
          throw new Error("retry failed");
        }
        return `updated-${prompt}`;
      },
    });

    expect(renderMarkdown(regenerated)).toBe("updated-one|initial-two");
    expect(getAiFieldErrors(regenerated)).toEqual([{ id: "ai-field-2", message: "retry failed" }]);
  });

  it("bounds concurrent AI requests", async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const content = Array.from({ length: 7 }, (_, index) => `<ai>field-${index}</ai>`).join("|");

    await generateSession(
      template(content),
      {},
      {
        async ask(prompt): Promise<string> {
          activeRequests += 1;
          maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
          await new Promise((resolve) => setTimeout(resolve, 1));
          activeRequests -= 1;
          return prompt;
        },
      }
    );

    expect(maximumActiveRequests).toBe(4);
  });

  it("does not parse placeholders or AI tags returned by AI", async () => {
    const client: AiClient = {
      async ask(): Promise<string> {
        return "\n<<word>>\n<ai>literal</ai>\n";
      },
    };
    const session = await generateSession(template("<ai>prompt</ai>"), { word: "changed" }, client);
    expect(renderMarkdown(session)).toBe("<<word>>\n<ai>literal</ai>");
  });

  it("preserves horizontal rule tags for Mochi", async () => {
    const session = await generateSession(template("Before<hr>After"), {}, { ask: async () => "unused" });

    expect(renderMarkdown(session)).toBe("Before<hr>After");
  });

  it("trims only outer empty lines from AI responses", () => {
    expect(trimOuterEmptyLines("\r\n  \r\n  first  \r\nsecond\r\n\t")).toBe("  first  \r\nsecond");
  });

  it("preserves a generated snapshot through manual editing", async () => {
    const generated = await generateSession(template("Plain text"), {}, { ask: async () => "unused" });
    const edited = editMarkdown(generated, "Manual text");

    expect(renderMarkdown(edited)).toBe("Manual text");
    expect(renderMarkdown(restoreGenerated(edited))).toBe("Plain text");
  });

  it("generates direct and custom Mochi fields with namespaced AI IDs and typed values", async () => {
    const generated = await generateSession(
      mochiTemplate(),
      { word: "λόγος", count: "7", enabled: true },
      { ask: async (prompt) => (prompt.includes("number") ? "42" : "unused") }
    );

    expect(getMochiFieldValues(generated)).toEqual({ name: "λόγος", amount: "42", active: true });
    expect(getGeneratedAiFields(generated).map((field) => field.id)).toEqual(["mochi:amount:ai-field-1"]);
    expect(generationFieldTitle(generated, "mochi:amount:ai-field-1")).toBe("Amount · AI Field 1");
    expect(generationFieldTitle(generated, "mochi:active")).toBe("Active");
    expect(isSessionReady(generated)).toBe(true);
  });

  it("keeps the Mochi card name required after manual editing", async () => {
    const generated = await generateSession(
      mochiTemplate(),
      { word: "λόγος", count: "7", enabled: true },
      { ask: async () => "42" }
    );
    const edited = editMochiValues(generated, { ...getMochiFieldValues(generated), name: " " });

    expect(getAiFieldErrors(edited)).toEqual([{ id: "mochi:name", message: "Name is required" }]);
    expect(isSessionReady(edited)).toBe(false);
  });

  it("blocks invalid custom number and boolean conversions", async () => {
    const source = mochiTemplate();
    const generated = await generateSession(
      {
        ...source,
        output: {
          kind: "mochi-template",
          target: {
            ...source.output.target,
            bindings: [
              { kind: "custom", targetFieldId: "amount", template: "not-a-number" },
              { kind: "custom", targetFieldId: "active", template: "yes" },
            ],
          },
        },
      },
      {},
      { ask: async () => "unused" }
    );

    expect(getAiFieldErrors(generated).map((error) => error.message)).toEqual([
      "Amount must produce a non-empty finite number",
      "Active must produce true or false",
    ]);
    expect(isSessionReady(generated)).toBe(false);
  });
});

function template(content: string): CardTemplate {
  return {
    id: "template-1",
    name: "Test",
    fields: [
      { id: "word", name: "word", type: "text", required: true, multiline: false },
      { id: "context", name: "context", type: "text", required: false, multiline: true },
    ],
    cardBody: content,
    output: { kind: "card-body", templateMode: "none" },
    deckId: "deck-1",
    deckName: "Vocabulary",
    tags: [],
    reviewReverse: false,
    archived: false,
    updatedAt: "2026-07-22T00:00:00.000Z",
  };
}

function mochiTemplate(): CardTemplate & {
  readonly output: Extract<CardTemplate["output"], { readonly kind: "mochi-template" }> & {
    readonly target: Extract<
      Extract<CardTemplate["output"], { readonly kind: "mochi-template" }>["target"],
      { readonly status: "configured" }
    >;
  };
} {
  return {
    id: "mapped-template",
    name: "Mapped",
    fields: [
      { id: "word", name: "word", type: "text", required: true, multiline: false },
      { id: "count", name: "count", type: "number", required: false },
      { id: "enabled", name: "enabled", type: "boolean" },
    ],
    cardBody: "Saved draft",
    output: {
      kind: "mochi-template",
      target: {
        status: "configured",
        template: {
          id: "mochi-template",
          name: "Mochi",
          fields: [
            { id: "name", name: "Name", type: "text", multiline: false },
            { id: "amount", name: "Amount", type: "number", multiline: false },
            { id: "active", name: "Active", type: "boolean", multiline: false },
          ],
        },
        bindings: [
          { kind: "input", targetFieldId: "name", sourceFieldId: "word" },
          { kind: "custom", targetFieldId: "amount", template: "<ai>number <<count>></ai>" },
          { kind: "input", targetFieldId: "active", sourceFieldId: "enabled" },
        ],
      },
    },
    deckId: "deck-1",
    deckName: "Deck",
    tags: [],
    reviewReverse: false,
    archived: false,
    updatedAt: "2026-07-22T00:00:00.000Z",
  };
}
