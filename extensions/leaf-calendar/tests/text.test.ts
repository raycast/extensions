import { describe, expect, it } from "vitest";
import { escapeMarkdown, eventMarkdown, isEmail } from "../src/lib/text";

describe("escapeMarkdown", () => {
  it("leaves no image, link or HTML to render", () => {
    const text = escapeMarkdown('![pixel](https://evil.example/t.png) [click](https://evil.example) <img src="x">');
    expect(text).not.toMatch(/(^|[^\\])!\[/);
    expect(text).not.toMatch(/(^|[^\\])\[/);
    expect(text).not.toMatch(/(^|[^\\])</);
  });

  it("keeps formatting characters as text", () => {
    expect(escapeMarkdown("# Not a heading *or bold* _or_ `code`")).toBe(
      "\\# Not a heading \\*or bold\\* \\_or\\_ \\`code\\`",
    );
  });

  it("keeps line breaks", () => {
    expect(escapeMarkdown("one\r\ntwo\nthree")).toBe("one  \ntwo  \nthree");
  });
});

describe("eventMarkdown", () => {
  it("shows the title as a heading and the description below", () => {
    expect(eventMarkdown({ title: "Design review", description: "Bring notes." })).toBe(
      "# Design review\n\nBring notes\\.",
    );
  });

  it("leaves out an empty description and names an untitled event", () => {
    expect(eventMarkdown({ title: "", description: "  \n " })).toBe("# \\(No title\\)");
  });

  it("shows text from the invite as text, never as links or HTML", () => {
    expect(eventMarkdown({ title: "<b>Hi</b>", description: "[click](https://evil.example)" })).toBe(
      "# \\<b\\>Hi\\</b\\>\n\n\\[click\\]\\(https://evil\\.example\\)",
    );
  });
});

describe("isEmail", () => {
  it("checks one address", () => {
    expect(isEmail("sam@example.com")).toBe(true);
    expect(isEmail("Sam <sam@example.com>")).toBe(false);
  });
});
