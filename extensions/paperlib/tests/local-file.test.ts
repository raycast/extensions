import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseLibraryText } from "../src/lib/local-library";

describe("fixture library", () => {
  it("loads the bundled JSON sample", async () => {
    const text = await readFile(join(__dirname, "fixtures/library.json"), "utf8");
    const papers = parseLibraryText(text, "library.json");
    expect(papers.map((paper) => paper.title)).toContain("Language Models are Few-Shot Learners");
    expect(papers[0].authors).toContain("Tom B. Brown");
  });
});
