import { describe, expect, it } from "vitest";

import { cardMarkdown } from "./mochi-card-content";
import type { MochiCard, MochiTemplate } from "./services/mochi-client";

describe("cardMarkdown", () => {
  it("uses card content before a Mochi template", () => {
    expect(cardMarkdown(card({ content: "# Saved Markdown" }), template())).toBe("# Saved Markdown");
  });

  it("renders horizontal rule tags in saved card content as Markdown horizontal rules", () => {
    expect(cardMarkdown(card({ content: "Before<hr />After" }))).toBe("Before\n\n---\n\nAfter");
  });

  it("renders template hr tags as Markdown horizontal rules", () => {
    expect(cardMarkdown(card(), template({ content: "Before<hr />After" }))).toBe("Before\n\n---\n\nAfter");
  });

  it("renders a field when its template name falls back to its ID", () => {
    expect(
      cardMarkdown(
        card({ fields: [{ id: "word", value: "grace" }] }),
        template({ content: "<< word >>", fields: [{ id: "word", name: "word", type: "text", multiline: false }] })
      )
    ).toBe("grace");
  });

  it("renders boolean fields as true or false", () => {
    expect(
      cardMarkdown(
        card({ fields: [{ id: "active", value: false }] }),
        template({
          content: "Enabled: << active >>",
          fields: [{ id: "active", name: "active", type: "boolean", multiline: false }],
        })
      )
    ).toBe("Enabled: false");
  });

  it("renders false instead of Empty in the field fallback", () => {
    expect(cardMarkdown(card({ fields: [{ id: "active", value: false }] }))).toBe("### active\n\nfalse");
  });

  it("asks to update the card when an AI result is missing", () => {
    expect(cardMarkdown(card(), template({ content: "<ai>Explain << Name >>.</ai>" }))).toBe(
      "_Update this card in Mochi to generate its content._"
    );
  });

  it("renders a Mochi template with fields and its latest matching AI result", () => {
    const prompt = 'Analyze the English word "grace".';
    const markdown = cardMarkdown(
      card({
        aiCacheEntries: [
          { prompt: `${prompt} {}`, text: "Older result", date: "2026-07-16" },
          { prompt: `${prompt} {}`, text: "Latest result", date: "2026-07-21" },
        ],
      }),
      template({
        content:
          '## << Name >>\n<ai>\nAnalyze the English word "<< Name >>".\n</ai>\n[More](https://example.com/<< Name >>)',
      })
    );

    expect(markdown).toBe("## grace  \nLatest result  \n[More](https://example.com/grace)");
  });
});

function card(overrides: Partial<MochiCard> = {}): MochiCard {
  return {
    id: "card-1",
    deckId: "deck-1",
    content: "",
    name: "grace",
    tags: [],
    fields: [{ id: "name", value: "grace" }],
    reviews: [],
    aiCacheEntries: [],
    ...overrides,
  };
}

function template(overrides: Partial<MochiTemplate> = {}): MochiTemplate {
  return {
    id: "template-1",
    name: "English AI Flashcard",
    content: "",
    fields: [{ id: "name", name: "Name", type: "text", multiline: false }],
    ...overrides,
  };
}
