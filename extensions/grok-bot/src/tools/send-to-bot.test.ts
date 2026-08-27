import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bot, parseAgentId } from "../lib/types";

const { resolveToolBot, sendPrompt } = vi.hoisted(() => ({
  resolveToolBot: vi.fn(),
  sendPrompt: vi.fn(),
}));

vi.mock("../lib/tool-roster", () => ({
  resolveToolBot,
}));

vi.mock("../lib/gateway", () => ({
  sendPrompt,
}));

import { takePendingSend } from "../lib/pending-send";
import tool, { confirmation } from "./send-to-bot";

function bot(overrides: { id: string; name: string } & Partial<Omit<Bot, "id" | "name">>): Bot {
  const id = parseAgentId(overrides.id);
  if (!id.ok) {
    throw new Error("invalid test id");
  }
  return {
    id: id.value,
    name: overrides.name,
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    isGroup: overrides.isGroup ?? false,
    isHidden: overrides.isHidden ?? false,
    status: overrides.status ?? { kind: "idle" },
    lastPreview: overrides.lastPreview ?? null,
    avatarColor: overrides.avatarColor ?? null,
    avatarHash: overrides.avatarHash ?? null,
  };
}

const piper = bot({ id: "a1", name: "Piper" });
const otherPiper = bot({ id: "a9", name: "Piper" });
const input = { bot: "Piper", prompt: "Summarize this week's errors" };

describe("send-to-bot", () => {
  beforeEach(() => {
    takePendingSend(input);
    resolveToolBot.mockResolvedValue(piper);
    sendPrompt.mockResolvedValue({ ok: true, value: { accepted: true } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends to the confirmed id when a later resolve matches someone else", async () => {
    await confirmation(input);
    resolveToolBot.mockResolvedValue(otherPiper);

    await expect(tool(input)).resolves.toBe("Sent task to Piper.");
    expect(sendPrompt).toHaveBeenCalledWith({ agentId: piper.id, prompt: input.prompt });
    expect(resolveToolBot).toHaveBeenCalledTimes(1);
  });

  it("refuses to send without a confirmation bind", async () => {
    await expect(tool(input)).rejects.toThrow("Confirm the recipient before sending.");
    expect(sendPrompt).not.toHaveBeenCalled();
  });
});
