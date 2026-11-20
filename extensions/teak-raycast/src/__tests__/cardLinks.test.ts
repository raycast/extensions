import { describe, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

mock.module("@raycast/api", () => createRaycastApiMock(false));

const { backlinksMarkdown, cardLinksToText, renderCardLinks } =
  await import("../lib/cardLinks");
const { parseCardReference } = await import("../lib/cardReference");

const TARGET = "k17abcdefghij1234567890abcdefghij";
const OTHER = "k17zzzzzzzzzz1234567890zzzzzzzzzz";
const token = (title: string, id = TARGET) => `[[${title}|teak:${id}]]`;

describe("card links in saved text", () => {
  test("shows a link by its card's current title, linked to the card", () => {
    const text = `See ${token("Old title")} for more`;
    const rendered = renderCardLinks(text, [
      { id: TARGET, missing: false, title: "New title", type: "text" },
    ]);
    expect(rendered).toBe(
      `See [New title](https://app.teakvault.com/?card=${TARGET}) for more`,
    );
  });

  test("falls back to the stored title before the cards are loaded", () => {
    expect(renderCardLinks(token("Stored"))).toBe(
      `[Stored](https://app.teakvault.com/?card=${TARGET})`,
    );
  });

  test("marks a card that was deleted, trashed or isn't yours", () => {
    expect(
      renderCardLinks(token("Gone"), [
        { id: TARGET, missing: true, title: null, type: null },
      ]),
    ).toBe("_Missing card_");
  });

  test("leaves tokens inside code alone", () => {
    const text = `\`${token("inline")}\`\n\n\`\`\`\n${token("fenced")}\n\`\`\``;
    expect(renderCardLinks(text)).toBe(text);
  });

  test("reads a token as its stored title in one-line previews", () => {
    expect(cardLinksToText(`Start with ${token("Plan")}.`)).toBe(
      "Start with Plan.",
    );
  });

  test("lists the cards that link here, leaving out missing ones", () => {
    expect(
      backlinksMarkdown([
        { id: TARGET, missing: false, title: "Plan", type: "text" },
        { id: OTHER, missing: true, title: null, type: null },
      ]),
    ).toBe(
      `## Linked from\n\n- [Plan](https://app.teakvault.com/?card=${TARGET})`,
    );
    expect(backlinksMarkdown([])).toBe("");
  });
});

describe("card references", () => {
  test("reads a bare id and a Teak link", () => {
    expect(parseCardReference(`  ${TARGET} `)).toBe(TARGET);
    expect(
      parseCardReference(`https://app.teakvault.com/?card=${TARGET}`),
    ).toBe(TARGET);
    expect(parseCardReference(`http://localhost:3000/?card=${TARGET}`)).toBe(
      TARGET,
    );
  });

  test.each(["", "card_1", "https://example.com/?card=short", "not a link"])(
    "rejects %p",
    (input) => {
      expect(parseCardReference(input)).toBeNull();
    },
  );
});
