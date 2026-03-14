import { describe, expect, it } from "vitest";
import { createEmptyTranscriptState, reduceSessionEvent } from "../lib/state";

describe("reduceSessionEvent", () => {
  it("appends text deltas to an existing part", () => {
    const initial = {
      ...createEmptyTranscriptState("session-1"),
      messages: [
        {
          info: {
            id: "message-1",
            sessionID: "session-1",
            role: "assistant",
            time: { created: Date.now() },
          } as never,
          parts: [
            {
              id: "part-1",
              sessionID: "session-1",
              messageID: "message-1",
              type: "text",
              text: "hello",
            } as never,
          ],
        },
      ],
    };

    const next = reduceSessionEvent(initial, {
      type: "message.part.delta",
      properties: {
        messageID: "message-1",
        partID: "part-1",
        field: "text",
        delta: " world",
      },
    });

    expect(next.messages[0]?.parts[0]).toMatchObject({ text: "hello world" });
  });

  it("tracks pending permissions and clears them on reply", () => {
    const initial = createEmptyTranscriptState("session-1");
    const asked = reduceSessionEvent(initial, {
      type: "permission.asked",
      properties: {
        id: "perm-1",
        sessionID: "session-1",
        permission: "write",
        patterns: ["src/**"],
        metadata: {},
        always: [],
      },
    });
    expect(asked.pending.permissions).toHaveLength(1);

    const replied = reduceSessionEvent(asked, {
      type: "permission.replied",
      properties: { requestID: "perm-1" },
    });
    expect(replied.pending.permissions).toHaveLength(0);
  });
});
