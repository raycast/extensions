import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RELEASE_REMOTE_BACKEND } from "./backendDecision";

describe("backendDecision", () => {
  it("locks the release-approved remote backend to MCP", () => {
    expect(RELEASE_REMOTE_BACKEND).toBe("mcp");
  });

  it("declares exactly one literal backend value in code, never configuration", () => {
    const source = readFileSync(resolve(__dirname, "backendDecision.ts"), "utf8");
    const literals = source.match(/RELEASE_REMOTE_BACKEND\s*=\s*"(?:mcp|openapi)" as const/g) ?? [];
    expect(literals).toHaveLength(1);
    expect(source).not.toMatch(/process\.env|getPreferenceValues|LocalStorage/);
  });
});
