import { describe, expect, test } from "bun:test";
import { MemoryStore, providerConfig } from "./test-helpers";
import { formatUsage, incrementUsage, loadProviderUsage, readUsage, summarizeProviderUsage, usageKey } from "../usage";

const NOW = new Date("2026-11-03T10:00:00Z");

describe("usageKey", () => {
  test("scopes usage by provider, hashed key, model, and day", () => {
    const key = usageKey(providerConfig("groq"), NOW);

    expect(key).toMatch(/^usage:groq:[0-9a-f]{8}:groq-model:2026-11-03$/);
    expect(key).not.toContain("groq-key");
  });

  test("changes when the API key or model changes", () => {
    const original = usageKey(providerConfig("groq"), NOW);

    expect(usageKey(providerConfig("groq", { apiKey: "other-key" }), NOW)).not.toBe(original);
    expect(usageKey(providerConfig("groq", { model: "other-model" }), NOW)).not.toBe(original);
  });

  test("rolls over on a new day", () => {
    const provider = providerConfig("groq");

    expect(usageKey(provider, new Date("2026-11-04T00:00:00Z"))).not.toBe(usageKey(provider, NOW));
  });

  test("uses a local fingerprint for providers without a key", () => {
    const key = usageKey(providerConfig("ollama", { apiKey: undefined }), NOW);

    expect(key).toBe("usage:ollama:local:ollama-model:2026-11-03");
  });
});

describe("usage counting", () => {
  test("starts at zero and counts each request", async () => {
    const store = new MemoryStore();
    const provider = providerConfig("gemini");

    expect(await readUsage(store, provider, NOW)).toEqual({
      period: "day",
      used: 0,
      limit: 250,
      remaining: 250,
    });

    await incrementUsage(store, provider, NOW);
    const usage = await incrementUsage(store, provider, NOW);

    expect(usage).toEqual({ period: "day", used: 2, limit: 250, remaining: 248 });
  });

  test("keeps separate counters per provider", async () => {
    const store = new MemoryStore();
    await incrementUsage(store, providerConfig("groq"), NOW);

    expect((await readUsage(store, providerConfig("gemini"), NOW)).used).toBe(0);
  });

  test("treats corrupted values as zero", async () => {
    const store = new MemoryStore();
    const provider = providerConfig("groq");
    await store.setItem(usageKey(provider, NOW), "not-a-number");

    expect((await readUsage(store, provider, NOW)).used).toBe(0);
  });
});

describe("provider usage overview", () => {
  test("loads usage for every configured provider in order", async () => {
    const store = new MemoryStore();
    const groq = providerConfig("groq");
    const gemini = providerConfig("gemini");
    await incrementUsage(store, gemini, NOW);

    const overview = await loadProviderUsage(store, [groq, gemini], NOW);

    expect(overview.map(({ provider, usage }) => [provider.id, usage.used])).toEqual([
      ["groq", 0],
      ["gemini", 1],
    ]);
  });

  test("summarizes one line per provider", () => {
    const summary = summarizeProviderUsage([
      {
        provider: providerConfig("openai", { model: "gpt-5" }),
        usage: { period: "day", used: 12, limit: undefined, remaining: undefined },
      },
      {
        provider: providerConfig("groq"),
        usage: { period: "day", used: 2, limit: 14_400, remaining: 14_398 },
      },
      {
        provider: providerConfig("ollama"),
        usage: { period: "day", used: 5, limit: undefined, remaining: undefined },
      },
    ]);

    expect(summary).toBe(
      [
        "Tries in order:",
        "1. OpenAI · gpt-5: 12 today",
        "2. Groq · groq-model: 2 / 14,400 today",
        "3. Ollama · ollama-model: 5 today",
      ].join("\n"),
    );
  });

  test("shows the only provider and its model without an order", () => {
    const summary = summarizeProviderUsage([
      {
        provider: providerConfig("anthropic"),
        usage: { period: "day", used: 1, limit: undefined, remaining: undefined },
      },
    ]);

    expect(summary).toBe("Anthropic · anthropic-model: 1 today");
  });

  test("explains how to configure a provider when none is set", () => {
    expect(summarizeProviderUsage([])).toBe("No provider configured. Add a connection in Manage Providers.");
  });
});

describe("formatUsage", () => {
  test("shows the limit when the provider has one", () => {
    expect(formatUsage({ period: "day", used: 1420, limit: 14_400, remaining: 12_980 })).toBe("1,420 / 14,400 today");
  });

  test("shows only the count for unlimited providers", () => {
    expect(formatUsage({ period: "day", used: 3, limit: undefined, remaining: undefined })).toBe("3 today");
  });
});
