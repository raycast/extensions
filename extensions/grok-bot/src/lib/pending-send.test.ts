import { beforeEach, describe, expect, it } from "vitest";
import { takePendingSend, writePendingSend } from "./pending-send";
import { parseAgentId } from "./types";

function agentId(raw: string) {
  const parsed = parseAgentId(raw);
  if (!parsed.ok) {
    throw new Error("invalid test id");
  }
  return parsed.value;
}

const piper = { id: agentId("a1"), name: "Piper" };
const scout = { id: agentId("a2"), name: "Scout" };
const sendPiper = { bot: "Piper", prompt: "Summarize this week's errors" };

describe("pending send bind", () => {
  beforeEach(() => {
    takePendingSend(sendPiper);
    takePendingSend({ bot: "Scout", prompt: sendPiper.prompt });
    takePendingSend({ bot: " Piper ", prompt: ` ${sendPiper.prompt} ` });
  });

  it("returns the confirmed recipient once", () => {
    writePendingSend({ ...sendPiper, target: piper });

    expect(takePendingSend(sendPiper)).toEqual(piper);
    expect(takePendingSend(sendPiper)).toBeNull();
  });

  it("does not mix two pending sends", () => {
    writePendingSend({ ...sendPiper, target: piper });
    writePendingSend({ bot: "Scout", prompt: sendPiper.prompt, target: scout });

    expect(takePendingSend({ bot: "Scout", prompt: sendPiper.prompt })).toEqual(scout);
    expect(takePendingSend(sendPiper)).toEqual(piper);
  });

  it("treats trimmed bot and prompt as the same confirmation", () => {
    writePendingSend({ bot: " Piper ", prompt: ` ${sendPiper.prompt} `, target: piper });

    expect(takePendingSend(sendPiper)).toEqual(piper);
  });
});
