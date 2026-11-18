import { describe, expect, it } from "vitest";
import { THEMES } from "beautiful-mermaid";
import {
  BEAUTIFUL_MERMAID_THEME_KEYS,
  BUNDLED_BEAUTIFUL_MERMAID_VERSION,
  getBundledBeautifulMermaidVersionFallback,
} from "../beautiful-mermaid-metadata";
import { getBundledBeautifulMermaidMetadata } from "../beautiful-mermaid-runtime";

describe("beautiful-mermaid metadata", () => {
  it("tracks the bundled package version", () => {
    expect(BUNDLED_BEAUTIFUL_MERMAID_VERSION).toBe(getBundledBeautifulMermaidMetadata().version);
  });

  it("tracks the full installed theme set", () => {
    expect(BEAUTIFUL_MERMAID_THEME_KEYS).toEqual(Object.keys(THEMES));
  });

  it("uses the bundled version when runtime metadata is unknown", () => {
    expect(getBundledBeautifulMermaidVersionFallback("unknown")).toBe(BUNDLED_BEAUTIFUL_MERMAID_VERSION);
    expect(getBundledBeautifulMermaidVersionFallback("")).toBe(BUNDLED_BEAUTIFUL_MERMAID_VERSION);
    expect(getBundledBeautifulMermaidVersionFallback("1.1.3")).toBe("1.1.3");
  });
});
