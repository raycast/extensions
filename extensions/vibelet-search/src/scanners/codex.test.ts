import { describe, expect, it } from "vitest";
import { parseCodexSessionMetaLine } from "./codex";
import type { CodexConversationLine } from "../types";

describe("parseCodexSessionMetaLine", () => {
  it("parses new format session_meta lines", () => {
    const line: CodexConversationLine = {
      type: "session_meta",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: {
        id: "019d-7-abc",
        cwd: "/Users/me/project",
      },
    };
    expect(parseCodexSessionMetaLine(line)).toEqual({
      id: "019d-7-abc",
      projectPath: "/Users/me/project",
      ts: new Date("2026-04-10T10:00:00.000Z").getTime(),
    });
  });

  it("parses old format session lines (no `type` field)", () => {
    const line: CodexConversationLine = {
      id: "old-style-id",
      timestamp: "2025-09-01T08:00:00.000Z",
      instructions: "you are a helpful assistant",
      git: { cwd: "/Users/me/old-project" },
    };
    expect(parseCodexSessionMetaLine(line)).toEqual({
      id: "old-style-id",
      projectPath: "/Users/me/old-project",
      ts: new Date("2025-09-01T08:00:00.000Z").getTime(),
    });
  });

  it("returns null when neither format matches", () => {
    expect(parseCodexSessionMetaLine({ type: "response_item" } as CodexConversationLine)).toBeNull();
    expect(parseCodexSessionMetaLine({} as CodexConversationLine)).toBeNull();
  });

  it("returns null when payload.id is missing in new format", () => {
    expect(
      parseCodexSessionMetaLine({
        type: "session_meta",
        timestamp: "2026-04-10T10:00:00.000Z",
        payload: { cwd: "/foo" },
      }),
    ).toBeNull();
  });

  it("handles missing cwd gracefully (empty string)", () => {
    const line: CodexConversationLine = {
      type: "session_meta",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: { id: "abc" },
    };
    expect(parseCodexSessionMetaLine(line)?.projectPath).toBe("");
  });
});
