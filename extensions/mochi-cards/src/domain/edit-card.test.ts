import { describe, expect, it } from "vitest";

import {
  cardChangedSinceOpen,
  createGenerationTemplateDraft,
  duplicateGenerationTemplateDraft,
  mergeUpdateFields,
  resolveGenerationTemplate,
  restoreInputValues,
} from "./edit-card";
import type { CardTemplate, MochiTemplateSnapshot } from "./template";

describe("resolveGenerationTemplate", () => {
  it("prefers the template saved in card context", () => {
    const first = template({ id: "first" });
    const second = template({ id: "second" });

    expect(
      resolveGenerationTemplate([first, second], "deck-1", "mochi-1", {
        generationTemplateId: "second",
        generationTemplateUpdatedAt: second.updatedAt,
        mochiTemplateId: "mochi-1",
        inputValues: {},
      })
    ).toMatchObject({ kind: "resolved", template: { id: "second" } });
  });

  it("resolves one configured template and asks when there are several", () => {
    const first = template({ id: "first" });
    const second = template({ id: "second" });

    expect(resolveGenerationTemplate([first], "deck-1", "mochi-1")).toMatchObject({ kind: "resolved" });
    expect(resolveGenerationTemplate([first, second], "deck-1", "mochi-1")).toMatchObject({
      kind: "choose",
      templates: [first, second],
    });
  });

  it("configures incomplete templates before duplicating or creating", () => {
    const incomplete = template({
      id: "incomplete",
      output: { kind: "mochi-template", target: { status: "needs-configuration", templateId: "mochi-1" } },
    });
    const otherDeck = template({ id: "other", deckId: "deck-2" });

    expect(resolveGenerationTemplate([incomplete, otherDeck], "deck-1", "mochi-1")).toMatchObject({
      kind: "configure",
    });
    expect(resolveGenerationTemplate([otherDeck], "deck-1", "mochi-1")).toMatchObject({ kind: "duplicate" });
    expect(resolveGenerationTemplate([], "deck-1", "mochi-1")).toEqual({ kind: "create" });
  });
});

describe("createGenerationTemplateDraft", () => {
  it("creates typed direct mappings with safe unique names", () => {
    const snapshot: MochiTemplateSnapshot = {
      id: "mochi-1",
      name: "Vocabulary",
      fields: [
        { id: "one", name: "Front side", type: "text", multiline: true },
        { id: "two", name: "Front side", type: "number", multiline: false },
        { id: "three", name: "123", type: "boolean", multiline: false },
        { id: "four", name: "Sketch", type: "drawing", multiline: false },
      ],
    };

    const result = createGenerationTemplateDraft(snapshot, { id: "deck-1", name: "Deck" });

    expect(result.draft).toMatchObject({
      name: "Vocabulary",
      deckId: "deck-1",
      tags: [],
      reviewReverse: false,
      archived: false,
      fields: [
        { id: "mochi-one", name: "Front_side", type: "text", required: false, multiline: true },
        { id: "mochi-two", name: "Front_side_2", type: "number", required: false },
        { id: "mochi-three", name: "field_123", type: "boolean" },
      ],
      output: {
        target: {
          bindings: [
            { kind: "input", targetFieldId: "one", sourceFieldId: "mochi-one" },
            { kind: "input", targetFieldId: "two", sourceFieldId: "mochi-two" },
            { kind: "input", targetFieldId: "three", sourceFieldId: "mochi-three" },
          ],
        },
      },
    });
    expect(result.warnings).toEqual(['Skipped unsupported Mochi field "Sketch" (drawing).']);
  });
});

describe("duplicateGenerationTemplateDraft", () => {
  it("copies the current Mochi template snapshot", () => {
    const live = {
      ...snapshot(),
      name: "Renamed Mochi",
      fields: [...snapshot().fields, { id: "hint", name: "Hint", type: "text", multiline: true }],
    };

    const draft = duplicateGenerationTemplateDraft(
      template({ deckId: "deck-2" }),
      { id: "deck-1", name: "Deck" },
      live
    );

    expect(draft.output).toMatchObject({
      kind: "mochi-template",
      target: { status: "configured", template: live },
    });
    expect(draft).toMatchObject({ deckId: "deck-1", deckName: "Deck" });
  });

  it("rejects a copy when a mapped Mochi field drifted", () => {
    const live = {
      ...snapshot(),
      fields: snapshot().fields.filter((field) => field.id !== "front"),
    };

    expect(() =>
      duplicateGenerationTemplateDraft(template({ deckId: "deck-2" }), { id: "deck-1", name: "Deck" }, live)
    ).toThrow('Mapped Mochi field "Front" was removed');
  });
});

describe("restoreInputValues", () => {
  it("uses matching context before inverse direct mappings", () => {
    const generationTemplate = template();
    const result = restoreInputValues(
      generationTemplate,
      { fields: [{ id: "front", value: "from card" }] },
      {
        context: {
          generationTemplateId: generationTemplate.id,
          generationTemplateUpdatedAt: generationTemplate.updatedAt,
          mochiTemplateId: "mochi-1",
          inputValues: { input: "from context" },
        },
      }
    );

    expect(result).toEqual({ values: { input: "from context" }, warnings: [] });
  });

  it("warns while partially restoring context from an older template revision", () => {
    const generationTemplate = template();

    expect(
      restoreInputValues(
        generationTemplate,
        { fields: [{ id: "front", value: "from card" }] },
        {
          context: {
            generationTemplateId: generationTemplate.id,
            generationTemplateUpdatedAt: "2026-07-23T00:00:00.000Z",
            mochiTemplateId: "mochi-1",
            inputValues: { input: "from older context" },
          },
        }
      )
    ).toEqual({
      values: { input: "from older context" },
      warnings: ["Generation Template changed since these inputs were saved; matching field IDs were restored."],
    });
  });

  it("restores inverse mappings and refuses conflicting values", () => {
    const generationTemplate = template({
      output: {
        kind: "mochi-template",
        target: {
          status: "configured",
          template: snapshot(),
          bindings: [
            { kind: "input", targetFieldId: "front", sourceFieldId: "input" },
            { kind: "input", targetFieldId: "back", sourceFieldId: "input" },
          ],
        },
      },
    });

    expect(
      restoreInputValues(generationTemplate, {
        fields: [
          { id: "front", value: "one" },
          { id: "back", value: "two" },
        ],
      })
    ).toEqual({
      values: { input: "" },
      warnings: [
        'Conflicting Mochi fields map to "Word"; value was not guessed.',
        'No saved value was found for "Word".',
      ],
    });
  });

  it("transfers values by one unique name and type after a template change", () => {
    const previous = template({
      id: "old",
      fields: [{ id: "old-input", name: "Word", type: "text", required: false, multiline: false }],
    });
    const next = template({
      id: "new",
      fields: [{ id: "new-input", name: "Word", type: "text", required: false, multiline: false }],
    });

    expect(
      restoreInputValues(next, { fields: [] }, { previous: { template: previous, values: { "old-input": "λόγος" } } })
    ).toEqual({ values: { "new-input": "λόγος" }, warnings: [] });
  });
});

describe("update field behavior", () => {
  it("preserves unmapped fields for the same Mochi template", () => {
    expect(
      mergeUpdateFields(
        {
          templateId: "mochi-1",
          fields: [
            { id: "front", value: "old" },
            { id: "unsupported", value: "keep" },
          ],
        },
        "mochi-1",
        { front: "new" }
      )
    ).toEqual({ front: "new", unsupported: "keep" });
  });

  it("sends only new fields after changing Mochi template", () => {
    expect(
      mergeUpdateFields({ templateId: "old", fields: [{ id: "old-field", value: "old" }] }, "new", {
        "new-field": "new",
      })
    ).toEqual({ "new-field": "new" });
  });

  it("detects concurrent remote changes", () => {
    const card = cardSnapshot();
    expect(cardChangedSinceOpen(card, card)).toBe(false);
    expect(cardChangedSinceOpen(card, { ...card, updatedAt: "2026-07-25T00:00:00.000Z" })).toBe(true);
  });
});

function snapshot(): MochiTemplateSnapshot {
  return {
    id: "mochi-1",
    name: "Mochi",
    fields: [
      { id: "front", name: "Front", type: "text", multiline: false },
      { id: "back", name: "Back", type: "text", multiline: false },
    ],
  };
}

function template(overrides: Partial<CardTemplate> = {}): CardTemplate {
  return {
    id: "generation-1",
    name: "Generation",
    fields: [{ id: "input", name: "Word", type: "text", required: false, multiline: false }],
    cardBody: "",
    output: {
      kind: "mochi-template",
      target: {
        status: "configured",
        template: snapshot(),
        bindings: [{ kind: "input", targetFieldId: "front", sourceFieldId: "input" }],
      },
    },
    deckId: "deck-1",
    deckName: "Deck",
    tags: [],
    reviewReverse: false,
    archived: false,
    updatedAt: "2026-07-24T00:00:00.000Z",
    ...overrides,
  };
}

function cardSnapshot() {
  return {
    id: "card-1",
    deckId: "deck-1",
    content: "",
    tags: [],
    fields: [{ id: "front", value: "word" }],
    templateId: "mochi-1",
    updatedAt: "2026-07-24T00:00:00.000Z",
  } as const;
}
