import { describe, expect, test } from "bun:test";
import { keyPageLinks, providersAfter } from "../providers";
import { providerConfig } from "./test-helpers";

describe("keyPageLinks", () => {
  test("links the free key pages first, then the paid providers", () => {
    expect(keyPageLinks()).toEqual([
      { title: "Get a Free Groq Key", url: "https://console.groq.com/keys" },
      { title: "Get a Free Gemini Key", url: "https://aistudio.google.com/app/apikey" },
      { title: "Get an OpenAI Key", url: "https://platform.openai.com/api-keys" },
      { title: "Get an Anthropic Key", url: "https://console.anthropic.com/settings/keys" },
      { title: "Get an OpenRouter Key", url: "https://openrouter.ai/settings/keys" },
    ]);
  });
});

describe("providersAfter", () => {
  const groq = providerConfig("groq");
  const gemini = providerConfig("gemini");
  const ollama = providerConfig("ollama");

  test("retries with the providers after the one that answered", () => {
    expect(providersAfter([groq, gemini, ollama], "groq")).toEqual([gemini, ollama]);
  });

  test("wraps around to the earlier providers", () => {
    expect(providersAfter([groq, gemini, ollama], "gemini")).toEqual([ollama, groq]);
  });

  test("keeps the list when the answering provider is no longer configured", () => {
    expect(providersAfter([gemini, ollama], "groq")).toEqual([gemini, ollama]);
  });

  test("keeps the only provider there is", () => {
    expect(providersAfter([groq], "groq")).toEqual([groq]);
  });
});
