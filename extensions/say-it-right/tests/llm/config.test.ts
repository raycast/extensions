import { describe, it, expect } from "vitest";
import {
  resolveAnalysisConfig,
  MissingKeyError,
  QWEN_BASE,
  GEMINI_BASE,
  MIMO_BASE,
  MINIMAX_BASE,
  pickInitialProvider,
} from "../../src/llm/config";

describe("resolveAnalysisConfig", () => {
  it("builds OpenAI config", () => {
    const c = resolveAnalysisConfig("openai", {
      openaiApiKey: "sk",
      openaiAnalysisModel: "gpt-5.5",
    });
    expect(c.baseURL).toBe("https://api.openai.com/v1");
    expect(c.model).toBe("gpt-5.5");
  });
  it("builds Qwen config on the Anthropic Token Plan base URL", () => {
    const c = resolveAnalysisConfig("qwen", {
      qwenAnalysisApiKey: "sk-sp",
    });
    expect(c.baseURL).toBe(QWEN_BASE.anthropic);
    expect(c.model).toBe("qwen3.6-flash");
    expect(c.apiProtocol).toBe("anthropic");
    expect(c.extraBody).toEqual({ thinking: { type: "disabled" } });
  });
  it("Qwen analysis can target a separate Token Plan endpoint + key", () => {
    const c = resolveAnalysisConfig("qwen", {
      qwenAnalysisApiKey: "sk-sp-placeholder",
      qwenAnalysisBaseURL:
        "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    });
    expect(c.baseURL).toBe(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    );
    expect(c.apiKey).toBe("sk-sp-placeholder");
    expect(c.extraBody).toEqual({ enable_thinking: false });
  });
  it("Qwen analysis can target an Anthropic-compatible Token Plan endpoint", () => {
    const c = resolveAnalysisConfig("qwen", {
      qwenAnalysisApiKey: "sk-sp",
      qwenAnalysisBaseURL:
        "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic",
    });
    expect(c.apiProtocol).toBe("anthropic");
    expect(c.extraBody).toEqual({ thinking: { type: "disabled" } });
  });
  it("does not use the DashScope TTS key for Qwen analysis", () => {
    expect(() =>
      resolveAnalysisConfig("qwen", { qwenApiKey: "sk-dashscope" }),
    ).toThrow(MissingKeyError);
  });
  it("sets Anthropic thinking disabled for default Qwen and no extraBody for OpenAI", () => {
    const qwen = resolveAnalysisConfig("qwen", { qwenAnalysisApiKey: "sk-sp" });
    expect(qwen.extraBody).toEqual({ thinking: { type: "disabled" } });
    const openai = resolveAnalysisConfig("openai", { openaiApiKey: "sk" });
    expect(openai.extraBody).toBeUndefined();
  });
  it("trims configured API keys before use", () => {
    expect(
      resolveAnalysisConfig("openai", { openaiApiKey: " sk-openai " }).apiKey,
    ).toBe("sk-openai");
    expect(
      resolveAnalysisConfig("gemini", { geminiApiKey: " sk-gemini " }).apiKey,
    ).toBe("sk-gemini");
    expect(
      resolveAnalysisConfig("mimo", { mimoApiKey: " tp-mimo " }).apiKey,
    ).toBe("tp-mimo");
    expect(
      resolveAnalysisConfig("minimax", { minimaxApiKey: " sk-mm " }).apiKey,
    ).toBe("sk-mm");
    expect(
      resolveAnalysisConfig("qwen", { qwenAnalysisApiKey: " sk-sp " }).apiKey,
    ).toBe("sk-sp");
  });
  it("builds Gemini config on its OpenAI-compatible endpoint", () => {
    const c = resolveAnalysisConfig("gemini", { geminiApiKey: "sk" });
    expect(c.baseURL).toBe(GEMINI_BASE);
    expect(c.baseURL.endsWith("/")).toBe(false); // client appends /chat/completions
    expect(c.model).toBe("gemini-3.5-flash");
    const override = resolveAnalysisConfig("gemini", {
      geminiApiKey: "sk",
      geminiAnalysisModel: "unknown-gemini",
    });
    expect(override.model).toBe("gemini-3.5-flash");
    const pro = resolveAnalysisConfig("gemini", {
      geminiApiKey: "sk",
      geminiAnalysisModel: "gemini-3.1-pro-preview",
    });
    expect(pro.model).toBe("gemini-3.1-pro-preview");
    const flashLite = resolveAnalysisConfig("gemini", {
      geminiApiKey: "sk",
      geminiAnalysisModel: "gemini-3.1-flash-lite",
    });
    expect(flashLite.model).toBe("gemini-3.1-flash-lite");
    const flash = resolveAnalysisConfig("gemini", {
      geminiApiKey: "sk",
      geminiAnalysisModel: "gemini-3-flash-preview",
    });
    expect(flash.model).toBe("gemini-3-flash-preview");
  });
  it("builds MiniMax config: Anthropic-compatible, M3 default, thinking off", () => {
    const c = resolveAnalysisConfig("minimax", { minimaxApiKey: "sk-mm" });
    expect(c.baseURL).toBe(MINIMAX_BASE);
    expect(c.model).toBe("MiniMax-M3");
    expect(c.apiProtocol).toBe("anthropic");
    expect(c.extraBody).toEqual({ thinking: { type: "disabled" } });
  });
  it("allows MiniMax M2.7 highspeed as an analysis model override", () => {
    const c = resolveAnalysisConfig("minimax", {
      minimaxApiKey: "sk-mm",
      minimaxAnalysisModel: "MiniMax-M2.7-highspeed",
    });
    expect(c.model).toBe("MiniMax-M2.7-highspeed");
  });
  it("builds MiMo config on the Anthropic Token Plan base URL", () => {
    const c = resolveAnalysisConfig("mimo", { mimoApiKey: "tp-x" });
    expect(c.baseURL).toBe(MIMO_BASE);
    expect(c.model).toBe("mimo-v2.5");
    expect(c.apiProtocol).toBe("anthropic");
    expect(c.authHeader).toBeUndefined();
    expect(c.extraBody).toEqual({ thinking: { type: "disabled" } });
  });
  it("keeps MiMo text generation on the Anthropic Token Plan endpoint", () => {
    const pro = resolveAnalysisConfig("mimo", {
      mimoApiKey: "tp-x",
      mimoAnalysisModel: "mimo-v2.5-pro",
      mimoBaseURL: "https://token-plan-cn.xiaomimimo.com/v1",
    });
    expect(pro.model).toBe("mimo-v2.5-pro");
    expect(pro.baseURL).toBe(MIMO_BASE);
    expect(pro.apiProtocol).toBe("anthropic");
    expect(pro.authHeader).toBeUndefined();
    expect(pro.extraBody).toEqual({ thinking: { type: "disabled" } });
  });
  it("routes stale pay-as-you-go MiMo bases to the Anthropic Token Plan endpoint", () => {
    const c = resolveAnalysisConfig("mimo", {
      mimoApiKey: "tp-x",
      mimoBaseURL: "https://api.xiaomimimo.com/v1",
    });
    expect(c.baseURL).toBe(MIMO_BASE);
    expect(c.apiProtocol).toBe("anthropic");
    expect(c.authHeader).toBeUndefined();
  });
  it("throws MissingKeyError when key absent", () => {
    expect(() => resolveAnalysisConfig("openai", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("qwen", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("gemini", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("minimax", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("mimo", {})).toThrow(MissingKeyError);
  });
  it("throws MissingKeyError for whitespace-only keys", () => {
    expect(() =>
      resolveAnalysisConfig("openai", { openaiApiKey: "  " }),
    ).toThrow(MissingKeyError);
    expect(() =>
      resolveAnalysisConfig("qwen", {
        qwenAnalysisApiKey: "  ",
      }),
    ).toThrow(MissingKeyError);
    expect(() =>
      resolveAnalysisConfig("gemini", { geminiApiKey: "  " }),
    ).toThrow(MissingKeyError);
    expect(() =>
      resolveAnalysisConfig("minimax", { minimaxApiKey: "  " }),
    ).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("mimo", { mimoApiKey: "  " })).toThrow(
      MissingKeyError,
    );
  });
});

describe("pickInitialProvider", () => {
  it("uses the only provider whose key is set", () => {
    expect(pickInitialProvider({ openaiApiKey: "sk" })).toBe("openai");
    expect(pickInitialProvider({ qwenAnalysisApiKey: "sk-sp" })).toBe("qwen");
  });
  it("does not count the DashScope TTS key as a Qwen analysis key", () => {
    expect(
      pickInitialProvider({
        qwenApiKey: "sk-dashscope",
        openaiApiKey: "sk-openai",
      }),
    ).toBe("openai");
  });
  it("falls back to the preferred provider when both keys are set", () => {
    expect(
      pickInitialProvider({
        openaiApiKey: "a",
        qwenAnalysisApiKey: "b",
        defaultAnalysisProvider: "qwen",
      }),
    ).toBe("qwen");
    expect(
      pickInitialProvider({ openaiApiKey: "a", qwenAnalysisApiKey: "b" }),
    ).toBe("qwen");
  });
  it("ignores blank/whitespace keys", () => {
    expect(
      pickInitialProvider({ openaiApiKey: "  ", qwenAnalysisApiKey: "sk-sp" }),
    ).toBe("qwen");
  });
  it("supports gemini as the sole or preferred provider", () => {
    expect(pickInitialProvider({ geminiApiKey: "sk" })).toBe("gemini");
    expect(
      pickInitialProvider({
        openaiApiKey: "a",
        qwenAnalysisApiKey: "b",
        geminiApiKey: "c",
        defaultAnalysisProvider: "gemini",
      }),
    ).toBe("gemini");
  });
  it("supports mimo as the sole or preferred provider", () => {
    expect(pickInitialProvider({ mimoApiKey: "tp" })).toBe("mimo");
    expect(
      pickInitialProvider({
        openaiApiKey: "a",
        mimoApiKey: "tp",
        defaultAnalysisProvider: "mimo",
      }),
    ).toBe("mimo");
  });
  it("supports minimax as the sole or preferred provider", () => {
    expect(pickInitialProvider({ minimaxApiKey: "sk-mm" })).toBe("minimax");
    expect(
      pickInitialProvider({
        qwenApiKey: "a",
        qwenAnalysisApiKey: "a-sp",
        minimaxApiKey: "b",
        defaultAnalysisProvider: "minimax",
      }),
    ).toBe("minimax");
  });
});
