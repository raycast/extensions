import { describe, test, expect } from "bun:test";
import { convertPrompt } from "../src/engine";

const apiKey = process.env.OPENAI_API_KEY;
const liveTestsEnabled =
  process.env.AI_SHELLSMITH_LIVE_TESTS === "1" && !!apiKey;
const describeLive = liveTestsEnabled ? describe : describe.skip;

describeLive("engine — live OpenAI", () => {
  const cases = [
    {
      prompt: "list files in current directory",
      patterns: [/ls/, /find/, /dir/],
    },
    { prompt: "show git status", patterns: [/git/, /status/] },
    {
      prompt: "compress image to 1mb",
      patterns: [/ffmpeg/, /magick/, /convert/, /mogrify/],
    },
  ];

  for (const { prompt, patterns } of cases) {
    test(
      prompt,
      async () => {
        const result = await convertPrompt({
          prompt,
          model: "gpt-5.4-nano",
          provider: "openai",
          apiKeys: { openai: apiKey },
        });

        expect(result.success).toBe(true);
        const command = result.command ?? "";
        expect(command.length).toBeGreaterThan(0);
        expect(patterns.some((p) => p.test(command))).toBe(true);
        expect(["context7", "ai", "cache"]).toContain(result.source);
      },
      30_000
    );
  }

  test("second identical call hits cache", async () => {
    const opts = {
      prompt: "print working directory",
      model: "gpt-5.4-nano",
      provider: "openai" as const,
      apiKeys: { openai: apiKey },
    };
    await convertPrompt(opts);
    const second = await convertPrompt(opts);
    expect(second.success).toBe(true);
    expect(second.source).toBe("cache");
  }, 30_000);
});

describe("engine — input validation", () => {
  test("missing API key returns failure", async () => {
    const result = await convertPrompt({
      prompt: "list files",
      model: "gpt-5.4-nano",
      provider: "openai",
      apiKeys: {},
    });
    expect(result.success).toBe(false);
    expect(result.title).toBe("API key not configured");
  });
});
