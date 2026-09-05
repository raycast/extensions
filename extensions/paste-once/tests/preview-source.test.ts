import { describe, expect, it } from "vitest";
import { reflowPreviewMarkdown, wrapAsSource } from "../src/lib/preview-source";

describe("wrapAsSource", () => {
  it("uses a longer fence when the text already contains triple backticks", () => {
    const text = "```ts\nconst x = 1\n```";
    expect(wrapAsSource(text)).toBe("````markdown\n```ts\nconst x = 1\n```\n````");
  });
});

describe("reflowPreviewMarkdown", () => {
  it("shows after and before when the text changed", () => {
    const preview = reflowPreviewMarkdown("- a\n  b\n- c", "- a b\n- c");
    expect(preview.startsWith("## After")).toBe(true);
    expect(preview.includes("## Before")).toBe(true);
    expect(preview.includes("- a b")).toBe(true);
  });

  it("says already clean when nothing changed", () => {
    expect(reflowPreviewMarkdown("- a\n- b", "- a\n- b")).toContain("Already clean");
  });
});
