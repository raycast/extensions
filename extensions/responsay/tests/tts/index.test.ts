import { describe, it, expect } from "vitest";
import {
  resolveTtsProvider,
  resolveTtsConfig,
  buildTtsInstructions,
  mimoTtsBaseURL,
} from "../../src/tts/index";
import { TTS_VOICES } from "../../src/llm/models";

describe("resolveTtsProvider", () => {
  it("follows the analysis provider by default", () => {
    expect(resolveTtsProvider("qwen", {})).toBe("qwen");
  });
  it("honors an explicit override", () => {
    expect(resolveTtsProvider("qwen", { ttsProvider: "openai" })).toBe(
      "openai",
    );
  });
  it("lets mimo speak when following the analysis provider", () => {
    expect(resolveTtsProvider("mimo", { mimoApiKey: "tp" })).toBe("mimo");
  });
  it("lets gemini speak when following the analysis provider", () => {
    expect(resolveTtsProvider("gemini", { geminiApiKey: "sk" })).toBe("gemini");
  });
  it("falls back to a configured TTS provider when follow-analysis lacks a TTS key", () => {
    expect(resolveTtsProvider("qwen", { openaiApiKey: "sk-openai" })).toBe(
      "openai",
    );
  });
  it("ignores stale MiniMax TTS overrides", () => {
    expect(resolveTtsProvider("qwen", { ttsProvider: "minimax" } as any)).toBe(
      "qwen",
    );
  });
});

describe("resolveTtsConfig", () => {
  it("uses gpt-4o-mini-tts for OpenAI", () => {
    const c = resolveTtsConfig("openai", {
      openaiApiKey: "sk",
      openaiTtsVoice: "nova",
    });
    expect(c.model).toBe("gpt-4o-mini-tts");
    expect(c.voice).toBe("nova");
  });
  it("uses the DashScope /api/v1 base for Qwen", () => {
    const c = resolveTtsConfig("qwen", {
      qwenApiKey: "sk",
      qwenRegion: "beijing",
    });
    expect(c.baseURL).toBe("https://dashscope.aliyuncs.com/api/v1");
    expect(c.model).toBe("qwen3-tts-flash");
  });
  it("builds Gemini TTS config", () => {
    const c = resolveTtsConfig("gemini", {
      geminiApiKey: "sk",
      geminiTtsVoice: "Puck",
    });
    expect(c.model).toBe("gemini-3.1-flash-tts-preview");
    expect(c.voice).toBe("Puck");
    expect(c.baseURL).toBe("https://generativelanguage.googleapis.com/v1beta");
  });
  it("builds MiMo TTS config (mimo-v2.5-tts, default Chloe voice)", () => {
    const c = resolveTtsConfig("mimo", {
      mimoApiKey: "tp",
      mimoTtsVoice: "Milo",
    });
    expect(c.model).toBe("mimo-v2.5-tts");
    expect(c.voice).toBe("Milo");
    expect(c.baseURL).toBe("https://token-plan-cn.xiaomimimo.com/v1");
  });
  it("keeps MiMo on documented English preset voices", () => {
    expect(TTS_VOICES.mimo.map((option) => option.id)).toEqual([
      "Chloe",
      "Mia",
      "Milo",
      "Dean",
    ]);
    expect(
      resolveTtsConfig("mimo", {
        mimoApiKey: "tp",
        mimoTtsVoice: "mimo_default",
      }).voice,
    ).toBe("Chloe");
  });
  it("routes Token Plan MiMo TTS away from stale pay-as-you-go bases", () => {
    const c = resolveTtsConfig("mimo", {
      mimoApiKey: "tp-x",
      mimoBaseURL: "https://api.xiaomimimo.com/v1",
    });
    expect(c.baseURL).toBe("https://token-plan-cn.xiaomimimo.com/v1");
  });
  it("maps MiMo Anthropic bases to matching TTS /v1 bases", () => {
    expect(
      mimoTtsBaseURL("https://token-plan-cn.xiaomimimo.com/anthropic"),
    ).toBe("https://token-plan-cn.xiaomimimo.com/v1");
    expect(
      mimoTtsBaseURL(
        "https://token-plan-sgp.xiaomimimo.com/anthropic/v1/messages",
      ),
    ).toBe("https://token-plan-sgp.xiaomimimo.com/v1");
    expect(mimoTtsBaseURL("https://api.xiaomimimo.com/v1")).toBe(
      "https://api.xiaomimimo.com/v1",
    );
  });
});

describe("buildTtsInstructions", () => {
  it("explains why the delivery must stay natural for TTS", () => {
    const instructions = buildTtsInstructions(1);
    expect(instructions).toContain("text-to-speech model");
    expect(instructions).toContain("natural phrase groups");
    expect(instructions).toContain("do not read document symbols");
  });

  it("adds a slow-pace clause only when rate < 1", () => {
    expect(buildTtsInstructions(1)).not.toMatch(/slowly/);
    expect(buildTtsInstructions(0.5)).toContain("50%");
  });
});
