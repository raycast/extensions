import { describe, expect, it } from "vitest";
import { buildTranscript, ChatMessage } from "../src/lib/transcript";

const at = "2026-10-08T00:00:00.000Z";

describe("buildTranscript", () => {
  it("writes the same shape as fm respond --save-transcript", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "My cat is Pixel.", createdAt: at },
      { role: "assistant", content: "Nice name.", createdAt: at },
    ];
    const file = buildTranscript("Be brief.", history);
    expect(file.modelName).toBe("system");
    expect(file.transcript.type).toBe("FoundationModels.Transcript");
    const entries = file.transcript.transcript.entries;
    expect(entries.map((entry) => entry.role)).toEqual(["instructions", "user", "response"]);
    expect(entries[1].contents[0]).toMatchObject({ type: "text", text: "My cat is Pixel." });
    expect(entries[1]).toMatchObject({ options: {}, contextOptions: {} });
    expect(entries[0].id).toMatch(/^[0-9A-F-]{36}$/);
  });

  it("has no instructions entry without instructions", () => {
    expect(buildTranscript("  ", []).transcript.transcript.entries).toEqual([]);
  });
});
