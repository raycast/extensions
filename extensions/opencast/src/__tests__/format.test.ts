import { describe, expect, it } from "vitest";
import {
  assistantMessageMarkdown,
  normalizeAssistantText,
} from "../lib/format";

describe("normalizeAssistantText", () => {
  it("extracts the answer field from json payloads", () => {
    const payload =
      '{"answer":"You said you would follow up with Dan.","tool_workflow":["search"],"confidence":"medium"}';

    expect(normalizeAssistantText(payload)).toBe(
      "You said you would follow up with Dan.",
    );
  });

  it("leaves normal markdown untouched", () => {
    const payload = "## Summary\n\n- first\n- second";

    expect(normalizeAssistantText(payload)).toBe(payload);
  });
});

describe("assistantMessageMarkdown", () => {
  it("normalizes json-shaped assistant text parts", () => {
    const markdown = assistantMessageMarkdown({
      info: {
        id: "msg-assistant",
        sessionID: "session-1",
        role: "assistant",
        time: { created: 1, completed: 2 },
        parentID: "msg-user",
        modelID: "gpt-5",
        providerID: "openai",
        mode: "build",
        path: { cwd: "/", root: "/" },
        cost: 0,
        tokens: {
          input: 1,
          output: 2,
          reasoning: 0,
          cache: { read: 0, write: 0 },
        },
      } as never,
      parts: [
        {
          id: "assistant-text",
          sessionID: "session-1",
          messageID: "msg-assistant",
          type: "text",
          text: '{"answer":"Clean markdown answer","tool_workflow":["search"]}',
        } as never,
      ],
    });

    expect(markdown).toBe("Clean markdown answer");
  });
});
