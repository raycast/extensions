import { describe, expect, it } from "vitest";
import { displayMarkdown } from "../src/lib/api";

describe("displayMarkdown", () => {
  it("removes Amplenote's inline metadata and empty-paragraph markers", () => {
    expect(displayMarkdown('- [ ] Task<!-- {"uuid":"1"} -->\n\\\nNext')).toBe("- [ ] Task\n\nNext");
  });

  it("demotes headings by the requested offset, capped at six levels", () => {
    expect(displayMarkdown("# Title\n\n###### Deep")).toBe("### Title\n\n###### Deep");
    expect(displayMarkdown("# Title", { headingOffset: 1 })).toBe("## Title");
    expect(displayMarkdown("# Title", { headingOffset: 0 })).toBe("# Title");
  });

  it("removes the blank lines Amplenote puts between list items, including nested ones", () => {
    expect(displayMarkdown("- [ ] One\n\n- [ ] Two\n\n    - [ ] Nested")).toBe(
      "- [ ] One\n- [ ] Two\n    - [ ] Nested",
    );
  });

  it("keeps the linked text of rich footnotes and drops the footnote blocks", () => {
    const input = "Go to the [corner store][^1] now [^2]\n\n[^1]: [corner store]()\n\n    At 123 Street.\n\nTail";
    expect(displayMarkdown(input)).toBe("Go to the corner store now\n\nTail");
  });

  it("limits image height and hides attachments Raycast cannot load", () => {
    expect(displayMarkdown("![a](https://x.y/a.png)")).toBe("![a](https://x.y/a.png?raycast-height=120)");
    expect(displayMarkdown("![a](https://x.y/a.png?v=1)")).toBe("![a](https://x.y/a.png?v=1&raycast-height=120)");
    expect(displayMarkdown("![](attachment://abc)")).toBe("");
  });

  it("shortens very long notes at a line break and says so", () => {
    const output = displayMarkdown("line of text\n".repeat(5000), { limit: 1000 });
    expect(output.length).toBeLessThan(1100);
    expect(output).toMatch(/Preview shortened/);
  });

  it("shortens a single huge line without hanging", () => {
    expect(displayMarkdown("x".repeat(900_000), { limit: 1000 }).length).toBeLessThan(1100);
  });
});
