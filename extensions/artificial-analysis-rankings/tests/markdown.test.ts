import { describe, expect, it } from "vitest";
import { escapeMarkdown, modelDetailsMarkdown } from "../src/lib/markdown";
import { rankModels } from "../src/lib/models";
import { buildStandings, standingsFor } from "../src/lib/standings";
import { model } from "./fixtures";

describe("model details markdown", () => {
  const models = [
    model({ id: "top", name: "Alpha (Max)", intelligence: 70, speed: null }),
    model({ id: "next", name: "Beta", intelligence: 60, inputPrice: 0.1 }),
  ];
  const table = buildStandings(models);

  it("leads with the family, provider, configuration, and the active metric's rank", () => {
    const entry = rankModels(models)[0];
    const markdown = modelDetailsMarkdown(entry, standingsFor(entry, table, ["intelligence", "speed"]));
    expect(markdown).toContain("# Alpha\n\nExample Lab · Max\n\n## 70.0\n\n**Intelligence Index** · #1 of 2");
    expect(markdown).toContain("| **Intelligence Index** | **70.0** | **#1 of 2** |");
    expect(markdown).toContain("| Output Speed | — | — |");
    expect(markdown).toContain("Speed and latency are medians across providers.");
    expect(markdown).not.toContain("Prices are USD");
  });

  it("labels price headlines per 1M tokens and escapes currency for the LaTeX renderer", () => {
    const entry = rankModels(models, "inputPrice")[0];
    const markdown = modelDetailsMarkdown(entry, standingsFor(entry, table, ["inputPrice", "outputPrice"]));
    expect(markdown).toContain("## \\$0.10\n\n**Input Price** per 1M tokens · #1 of 2");
    expect(markdown).toContain("Prices are USD per 1M tokens.");
  });

  it("renders API text and warnings literally", () => {
    const entry = rankModels([model({ name: "Evil | *Model* <b>#1</b> (High)", creator: "Lab_[x]" })])[0];
    const markdown = modelDetailsMarkdown(entry, [], "Limit reached.\nRetry later.");
    expect(markdown).toContain("# Evil \\| \\*Model\\* \\<b\\>\\#1\\</b\\>");
    expect(markdown).toContain("Lab\\_\\[x\\] · High");
    expect(markdown).toContain("> Limit reached. Retry later.");
    expect(escapeMarkdown("a\r\nb")).toBe("a b");
  });
});
