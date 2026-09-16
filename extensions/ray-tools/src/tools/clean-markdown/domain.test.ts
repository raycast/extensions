import { cleanMarkdown } from "./domain";

describe("Markdown cleaning", () => {
  it("removes inline formatting but keeps ordinary punctuation", () => {
    expect(
      cleanMarkdown(
        "**Жирный** и *курсив*, ~~зачёркнутый~~, `const value = 1` и 2 * 3.",
      ),
    ).toBe("Жирный и курсив, зачёркнутый, const value = 1 и 2 * 3.");
  });

  it("removes headings, quotes, list syntax, and task markers", () => {
    expect(
      cleanMarkdown(
        "# Заголовок\n\n> Цитата\n\n- [x] Готово\n- [ ] Сделать\n1. Первый пункт",
      ),
    ).toBe("Заголовок\n\nЦитата\n\n☑ Готово\n☐ Сделать\n1) Первый пункт");
  });

  it("keeps useful content from links and removes code fences", () => {
    expect(
      cleanMarkdown(
        "[Документация](https://example.com/docs)\n\n```ts\nconst value = **1**;\n```",
      ),
    ).toBe("Документация (https://example.com/docs)\n\nconst value = **1**;");
  });

  it("respects escaped Markdown characters and underscores in words", () => {
    expect(cleanMarkdown("\\*не форматирование\\* и snake_case")).toBe(
      "*не форматирование* и snake_case",
    );
  });

  it("removes excessive blank lines and horizontal rules", () => {
    expect(cleanMarkdown("До\n\n\n---\n\nПосле")).toBe("До\n\nПосле");
  });
});
