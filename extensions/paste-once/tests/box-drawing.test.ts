import { describe, expect, it } from "vitest";
import { TextCleaner } from "../src/lib/text-cleaner";
import { cleaner, transformIfCommand } from "./helpers";

describe("box-drawing cleanup", () => {
  it("removes box drawing after a pipe", () => {
    expect(TextCleaner.stripBoxDrawingCharacters("curl -I https://example.com | │ head -n 5")).toBe(
      "curl -I https://example.com | head -n 5",
    );
  });

  it("collapses multiple box drawing after a pipe", () => {
    expect(TextCleaner.stripBoxDrawingCharacters("cmd | │ │ grep foo")).toBe("cmd | grep foo");
  });

  it("removes box drawing inserted by a terminal wrap", () => {
    expect(
      TextCleaner.stripBoxDrawingCharacters(
        "curl -I https://github.com/steipete/Trimmy/releases/ │ download/v0.4.5/Trimmy-0.4.5.zip | head -n 5",
      ),
    ).toBe("curl -I https://github.com/steipete/Trimmy/releases/download/v0.4.5/Trimmy-0.4.5.zip | head -n 5");
  });

  it("strips lone box glyphs when no pipe is present", () => {
    expect(TextCleaner.stripBoxDrawingCharacters("│ this line has decoration but no pipe")).toBe(
      "this line has decoration but no pipe",
    );
  });

  it("preserves legit pipes without box drawing", () => {
    expect(TextCleaner.stripBoxDrawingCharacters("curl -I https://example.com | head -n 5")).toBeNull();
  });

  it("preserves indentation when no box drawing is present", () => {
    const input = `{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow" }
  ]
}`;
    expect(TextCleaner.stripBoxDrawingCharacters(input)).toBeNull();
  });

  it("returns nil when the setting is off", () => {
    expect(cleaner().cleanBoxDrawingCharacters("hello │ │ world", false)).toBeNull();
  });

  it("collapses extra spaces after stripping", () => {
    expect(cleaner().cleanBoxDrawingCharacters("│ │ echo   │ │    hi │ │", true)).toBe("echo hi");
  });

  it("still allows command flattening after cleanup", () => {
    const text = `│ │ kubectl \\
│ │   get pods`;
    const cleaned = cleaner().cleanBoxDrawingCharacters(text, true);
    expect(cleaned?.includes("kubectl \\")).toBe(true);
    expect(transformIfCommand(cleaned ?? "", { aggressiveness: "high" })).toBe("kubectl get pods");
  });

  it("strips leading box runs across lines", () => {
    const text = `│ ls -la \\
│   | grep '^d'`;
    const cleaned = cleaner().cleanBoxDrawingCharacters(text, true);
    expect(cleaned).toBe("ls -la \\\n | grep '^d'");
    expect(transformIfCommand(cleaned ?? "", { aggressiveness: "high" })).toBe("ls -la | grep '^d'");
  });

  it("strips trailing box runs across lines", () => {
    const text = `echo hi │
| tr h H │
`;
    const cleaned = cleaner().cleanBoxDrawingCharacters(text, true);
    expect(cleaned).toBe("echo hi\n| tr h H");
    expect(transformIfCommand(cleaned ?? "", { aggressiveness: "high" })).toBe("echo hi | tr h H");
  });

  it("strips leading when most lines share a gutter", () => {
    const text = `│ echo hi
│ cat file
plain line`;
    expect(cleaner().cleanBoxDrawingCharacters(text, true)).toBe("echo hi\ncat file\nplain line");
  });

  it("strips trailing when most lines share a gutter", () => {
    const text = `echo hi │
run thing │
plain line`;
    expect(cleaner().cleanBoxDrawingCharacters(text, true)).toBe("echo hi\nrun thing\nplain line");
  });

  it("still strips leftover glyphs when the gutter is below majority", () => {
    const text = `│ echo hi
plain line
plain line two`;
    expect(cleaner().cleanBoxDrawingCharacters(text, true)).toBe("echo hi\nplain line\nplain line two");
  });

  it("strips a single line with a leading gutter", () => {
    expect(cleaner().cleanBoxDrawingCharacters("│ kubectl get pods", true)).toBe("kubectl get pods");
  });

  it("strips both sides when most lines do", () => {
    const text = `│ ls -la │
│   | grep '^d' │
plain line`;
    const cleaned = cleaner().cleanBoxDrawingCharacters(text, true);
    expect(cleaned).toBe("ls -la\n | grep '^d'\nplain line");
    expect(transformIfCommand(cleaned ?? "", { aggressiveness: "high" })).toBe("ls -la | grep '^d' plain line");
  });

  it("ignores empty lines when detecting a gutter", () => {
    const text = `
│ echo hi

│ cat file
`;
    expect(cleaner().cleanBoxDrawingCharacters(text, true)).toBe("echo hi\n\ncat file");
  });

  it("strips leading and trailing box runs with mixed counts", () => {
    const text = `││ curl https://example.com │
││   | jq '.data' │`;
    const cleaned = cleaner().cleanBoxDrawingCharacters(text, true);
    expect(cleaned).toBe("curl https://example.com\n | jq '.data'");
    expect(transformIfCommand(cleaned ?? "", { aggressiveness: "high" })).toBe("curl https://example.com | jq '.data'");
  });

  it("does not treat mid-line glyphs as a shared gutter", () => {
    expect(cleaner().cleanBoxDrawingCharacters("echo │hi│ there", true)).toBe("echo hi there");
  });

  it("does not strip legit pipes", () => {
    expect(cleaner().cleanBoxDrawingCharacters("echo 1 | wc -l", true)).toBeNull();
    expect(transformIfCommand("echo 1 | wc -l", { aggressiveness: "high" })).toBeNull();
  });
});
