import { describe, it, expect } from "vitest";
import { renderAnalysis } from "../../src/render/markdown";
import { EXAMPLE } from "../../src/__fixtures__/analysis";

describe("renderAnalysis", () => {
  const md = renderAnalysis(EXAMPLE);

  it("uppercases the stressed syllable of content words", () => {
    expect(md).toContain("FIN·ish");
    expect(md).toContain("EAR·ly");
    expect(md).toContain("GIVE");
    expect(md).toContain("CALL");
  });
  it("lowercases function words inside the intonation block", () => {
    const intoBlock = md.split("```")[1]; // content of the first fenced block
    expect(intoBlock).toContain("if");
    expect(intoBlock).toContain("you");
  });
  it("attaches tone arrows to the nuclear (stressed) word", () => {
    const intoBlock = md.split("```")[1];
    expect(intoBlock).toContain("● ↗"); // rising nuclear (early)
    expect(intoBlock).toContain("● ↘"); // falling nuclear (call)
  });
  it("marks the thought-group boundary and IPA and linking", () => {
    expect(md).toContain("‖");
    expect(md).toContain(EXAMPLE.ipa);
    expect(md).toContain("finish‿early");
  });
  it("emits aligned mark/word staves (line pairs) within width-capped code blocks", () => {
    const blocks = md.split("```").filter((_, i) => i % 2 === 1);
    expect(blocks.length).toBe(2); // intonation + rhythm
    for (const b of blocks) {
      const rows = b.split("\n").filter((r) => r.length > 0); // drop blank separators
      expect(rows.length % 2).toBe(0); // mark line + word line pairs
      expect(rows.length).toBeGreaterThanOrEqual(2);
      for (const r of rows) expect([...r].length).toBeLessThanOrEqual(50); // chunked, never a runaway line
    }
  });
  it("renders the example-sentence subtitle for single-word input", () => {
    const wordExample = {
      ...EXAMPLE,
      isGeneratedExample: true,
      sourceWord: "call",
    };
    const out = renderAnalysis(wordExample);
    expect(out).toContain("Example sentence for");
    expect(out).toContain("**call**");
  });
  it("can render as a nested page section without the top title", () => {
    const out = renderAnalysis(EXAMPLE, {
      includeTitle: false,
      sectionHeadingLevel: 3,
    });
    expect(out).not.toContain("# 🗣️ How to say it");
    expect(out).toContain("### Stress & Intonation");
    expect(out).toContain("### Rhythm");
  });
  it("includes a legend explaining the marks", () => {
    expect(md).toContain("stressed");
    expect(md).toContain("unstressed");
    expect(md).toContain("linking");
  });
  it("wraps long input into multiple staves (marks stay above words)", () => {
    const long = {
      ...EXAMPLE,
      thoughtGroups: [
        {
          tone: "fall" as const,
          words: Array.from({ length: 20 }, (_, i) => ({
            text: `word${i}`,
            syllables: ["word"],
            stressIndex: 0,
            stressed: true,
            nuclear: i === 19,
          })),
        },
      ],
    };
    const out = renderAnalysis(long);
    const firstBlock = out.split("```")[1];
    const rows = firstBlock.split("\n").filter((r) => r.length > 0);
    expect(rows.length).toBeGreaterThan(2); // more than one stave
  });
});
