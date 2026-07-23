import { describe, expect, it } from "vitest";
import { mergeStartAgentPresets, normalizeStartAgentPreset } from "../src/lib/start-agent-preset";

describe("normalizeStartAgentPreset", () => {
  it("keeps supported preset fields", () => {
    expect(
      normalizeStartAgentPreset({
        kind: "codex",
        name: "review",
        destination: "new-workspace",
        cwd: "/project",
        arguments: "--model fast",
        prompt: "Review the changes",
        focusAfter: false,
        environment: "TOKEN=secret",
      }),
    ).toEqual({
      kind: "codex",
      name: "review",
      destination: "new-workspace",
      cwd: "/project",
      arguments: "--model fast",
      prompt: "Review the changes",
      focusAfter: false,
    });
  });

  it("discards unsupported values", () => {
    expect(
      normalizeStartAgentPreset({
        kind: "unknown",
        destination: "window:1",
        cwd: 42,
        focusAfter: "yes",
      }),
    ).toEqual({});
  });
});

describe("mergeStartAgentPresets", () => {
  it("lets supplied command arguments override quicklink context", () => {
    expect(
      mergeStartAgentPresets(
        { kind: "claude", destination: "new-workspace", prompt: "From quicklink" },
        { kind: "codex", destination: "", prompt: "From search" },
      ),
    ).toEqual({ kind: "codex", destination: "new-workspace", prompt: "From search" });
  });
});
