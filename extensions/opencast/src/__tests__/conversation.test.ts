import { describe, expect, it } from "vitest";
import { buildConversationBlocks, plainText } from "../lib/conversation";

describe("plainText", () => {
  it("strips basic markdown formatting", () => {
    expect(plainText("**Bold** [link](https://example.com)")).toBe("Bold link");
  });
});

describe("buildConversationBlocks", () => {
  it("summarizes assistant text, reasoning, and tool calls into blocks", () => {
    const blocks = buildConversationBlocks([
      {
        info: {
          id: "msg-user",
          sessionID: "session-1",
          role: "user",
          time: { created: 1 },
          agent: "build",
          model: { providerID: "openai", modelID: "gpt-5" },
        } as never,
        parts: [
          {
            id: "user-text",
            sessionID: "session-1",
            messageID: "msg-user",
            type: "text",
            text: "Find my next meeting",
          } as never,
        ],
      },
      {
        info: {
          id: "msg-assistant",
          sessionID: "session-1",
          role: "assistant",
          time: { created: 2, completed: 5 },
          parentID: "msg-user",
          modelID: "gpt-5",
          providerID: "openai",
          mode: "build",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            input: 1,
            output: 2,
            reasoning: 3,
            cache: { read: 0, write: 0 },
          },
        } as never,
        parts: [
          {
            id: "assistant-text",
            sessionID: "session-1",
            messageID: "msg-assistant",
            type: "text",
            text: "I can check your calendar.",
          } as never,
          {
            id: "reasoning",
            sessionID: "session-1",
            messageID: "msg-assistant",
            type: "reasoning",
            text: "Considering calendar events",
            time: { start: 3 },
          } as never,
          {
            id: "tool",
            sessionID: "session-1",
            messageID: "msg-assistant",
            type: "tool",
            callID: "call-1",
            tool: "openwork_get_status",
            state: {
              status: "completed",
              input: {},
              output: '{"ok":true}',
              title: "Tool: openwork_get_status",
              metadata: {},
              time: { start: 4, end: 6 },
            },
          } as never,
        ],
      },
    ]);

    expect(blocks.map((item) => item.kind)).toEqual([
      "message",
      "reasoning-summary",
      "tool-call",
      "message",
    ]);
    expect(blocks[1]).toMatchObject({ title: "Considering calendar events" });
    expect(blocks[2]).toMatchObject({
      title: "Tool: openwork_get_status",
      kind: "tool-call",
      status: "completed",
    });
  });
});
