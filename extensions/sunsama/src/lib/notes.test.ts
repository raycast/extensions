import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./notes";

describe("htmlToMarkdown", () => {
  it("returns empty for empty/placeholder notes", () => {
    expect(htmlToMarkdown("")).toBe("");
    expect(htmlToMarkdown(undefined)).toBe("");
    expect(htmlToMarkdown("<p></p>")).toBe("");
  });

  it("converts paragraphs and headings", () => {
    expect(htmlToMarkdown("<h3>Title</h3><p>Body text</p>")).toBe(
      "### Title\n\nBody text",
    );
  });

  it("converts inline marks and links", () => {
    expect(
      htmlToMarkdown(
        '<p><strong>bold</strong> and <a href="https://x.com">x</a></p>',
      ),
    ).toBe("**bold** and [x](https://x.com)");
  });

  it("converts checkbox task lists (Sunsama taskItem markup)", () => {
    const html =
      '<ul data-type="taskList">' +
      '<li data-type="taskItem" class="editor-todo-item"><label><input type="checkbox"></label><div><p>Brush Teeth</p></div></li>' +
      '<li data-type="taskItem"><label><input type="checkbox" checked></label><div><p>Done thing</p></div></li>' +
      "</ul>";
    expect(htmlToMarkdown(html)).toBe("- [ ] Brush Teeth\n- [x] Done thing");
  });

  it("converts bullet and ordered lists", () => {
    expect(htmlToMarkdown("<ul><li>a</li><li>b</li></ul>")).toBe("- a\n- b");
    expect(htmlToMarkdown("<ol><li>a</li><li>b</li></ol>")).toBe("1. a\n1. b");
  });

  it("decodes entities and strips unknown tags", () => {
    expect(htmlToMarkdown("<p><span>a &amp; b</span></p>")).toBe("a & b");
  });
});
