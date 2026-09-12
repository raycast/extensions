import { describe, expect, it } from "vitest";
import {
  currentPhiInvocationContext,
  runWithPhiInvocation,
  serializePhiInvocationContext,
} from "../src/invocation-context";

describe("Phi invocation context", () => {
  it("keeps one invocation ID across asynchronous AppleScript calls", async () => {
    const contexts = await runWithPhiInvocation(
      {
        clientCommand: "search-tabs",
        clientAction: "activate-tab",
      },
      async () => {
        const first = currentPhiInvocationContext();
        await Promise.resolve();
        const second = JSON.parse(serializePhiInvocationContext());
        return [first, second];
      },
    );

    expect(contexts[0]).toEqual(contexts[1]);
    expect(contexts[0]).toMatchObject({
      schemaVersion: 1,
      clientId: "raycast",
      clientCommand: "search-tabs",
      clientAction: "activate-tab",
    });
    expect(contexts[0]?.invocationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("creates a new invocation ID for each user operation", async () => {
    const first = await runWithPhiInvocation(
      { clientCommand: "new-window" },
      () => currentPhiInvocationContext().invocationId,
    );
    const second = await runWithPhiInvocation(
      { clientCommand: "new-window" },
      () => currentPhiInvocationContext().invocationId,
    );

    expect(first).not.toBe(second);
  });
});
