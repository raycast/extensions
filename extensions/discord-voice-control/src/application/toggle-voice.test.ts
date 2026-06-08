import { describe, expect, it, vi } from "vitest";
import type { DiscordController } from "../domain/control";
import { buildResult } from "../domain/result";
import type { VoiceAction, VoiceControlResult } from "../domain/types";
import { toggleVoice } from "./toggle-voice";

function controllerReturning(result: VoiceControlResult): DiscordController {
  return { name: "mock", perform: vi.fn(async () => result) };
}

const SUCCESS = buildResult({
  action: "toggleMute",
  mechanism: "shortcut",
  outcome: "success",
  reasonCode: "shortcutDispatched",
});

describe("toggleVoice", () => {
  it("passes through the controller result", async () => {
    const log = vi.fn(async () => {});
    const result = await toggleVoice("toggleMute", {
      controller: controllerReturning(SUCCESS),
      diagnosticLogging: false,
      log,
    });
    expect(result).toEqual(SUCCESS);
  });

  it("logs the result with the diagnostic flag", async () => {
    const log = vi.fn(async () => {});
    await toggleVoice("toggleDeafen", {
      controller: controllerReturning(SUCCESS),
      diagnosticLogging: true,
      log,
    });
    expect(log).toHaveBeenCalledWith(SUCCESS, true);
  });

  it("normalizes an unexpected thrown error into a typed failed result (no leak, no success)", async () => {
    const throwing: DiscordController = {
      name: "throwing",
      perform: vi.fn(async () => {
        throw new Error("boom: /usr/bin/osascript exploded with secrets");
      }),
    };
    const log = vi.fn(async () => {});
    const result = await toggleVoice("toggleMute", {
      controller: throwing,
      diagnosticLogging: false,
      log,
    });
    expect(result.outcome).toBe("failed");
    expect(result.reasonCode).toBe("unexpectedError");
    expect(result.message.toLowerCase()).not.toContain("osascript");
    expect(result.message.toLowerCase()).not.toContain("muted");
    // raw detail is confined to diagnostics, not the user message
    expect(result.diagnostics?.errorCategory).toBe("internalError");
  });

  it.each<[VoiceAction]>([["toggleMute"], ["toggleDeafen"]])(
    "still logs when the controller throws (%s)",
    async (action) => {
      const throwing: DiscordController = {
        name: "throwing",
        perform: vi.fn(async () => {
          throw new Error("x");
        }),
      };
      const log = vi.fn(async () => {});
      await toggleVoice(action, { controller: throwing, diagnosticLogging: true, log });
      expect(log).toHaveBeenCalledOnce();
    },
  );
});
