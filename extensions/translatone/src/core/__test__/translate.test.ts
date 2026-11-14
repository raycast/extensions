import { describe, expect, setSystemTime, test } from "bun:test";
import {
  AllProvidersFailedError,
  EmptyTextError,
  NoProviderConfiguredError,
  ProviderError,
} from "../errors";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../languages";
import { languagePair, type TaggedReply } from "../target";
import {
  completionResponse,
  MemoryStore,
  providerConfig,
  rejectionOf,
  scriptedFetch,
  sseEvent,
  streamResponse,
} from "./test-helpers";
import { translate, visibleTranslation, type TranslationDependencies } from "../translate";
import { usageKey } from "../usage";

const NOW = new Date("2026-11-03T10:00:00Z");
const groq = providerConfig("groq");
const gemini = providerConfig("gemini");

const request = {
  text: "Halo",
  tone: "default",
  target: languagePair(DEFAULT_LANGUAGE, resolveLanguage("id", DEFAULT_LANGUAGE)),
} as const;

function dependencies(
  responses: ReadonlyMap<string, () => Promise<Response>>,
  overrides: Partial<TranslationDependencies> = {},
) {
  const { fetch, calls } = scriptedFetch(responses);
  const store = new MemoryStore();
  return {
    calls,
    store,
    deps: { providers: [groq, gemini], store, fetch, now: () => NOW, ...overrides },
  };
}

describe("visibleTranslation", () => {
  test.each([
    ["the streamed text while loading", "Old", "New par", true, "New par"],
    ["the previous result until new text arrives", "Old", "", true, "Old"],
    ["the finished result once loading ends", "Done", "Done", false, "Done"],
    ["the streamed text when there is no result yet", undefined, "Par", true, "Par"],
    ["nothing before anything arrives", undefined, "", true, ""],
  ])("shows %s", (_label, finished, streamed, isLoading, expected) => {
    expect(visibleTranslation(finished, streamed, isLoading)).toBe(expected);
  });
});

describe("translate", () => {
  test("uses the first provider and records its usage", async () => {
    const { deps, calls } = dependencies(
      new Map([["groq.test", async () => completionResponse("Hello")]]),
    );

    const result = await translate(request, deps);

    expect(result.text).toBe("Hello");
    expect(result.provider).toBe(groq);
    expect(result.usage.used).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  test("returns the direction the model reports and strips its tag", async () => {
    const { deps, calls } = dependencies(
      new Map([["groq.test", async () => completionResponse("⟦id→en⟧\nHello")]]),
    );

    const result = await translate(request, deps);

    expect(result.text).toBe("Hello");
    expect(result.direction).toEqual({ source: "Indonesian", target: "English" });
    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? body : "").toContain(
      "If it is English, translate it into Indonesian.",
    );
  });

  test("streams partial translations with the tag hidden", async () => {
    const { deps } = dependencies(
      new Map([
        [
          "groq.test",
          async () =>
            streamResponse({
              chunks: [sseEvent("⟦id"), sseEvent("→en⟧\nHel"), sseEvent("lo"), "data: [DONE]\n\n"],
            }),
        ],
      ]),
    );
    const partials: TaggedReply[] = [];

    const result = await translate(
      { ...request, onPartial: (partial) => partials.push(partial) },
      deps,
    );

    expect(partials.map((partial) => partial.text)).toEqual(["", "Hel", "Hello"]);
    expect(partials.at(-1)?.direction).toEqual({ source: "Indonesian", target: "English" });
    expect(result.text).toBe("Hello");
  });

  test("has no direction when the model omits the tag", async () => {
    const { deps } = dependencies(
      new Map([["groq.test", async () => completionResponse("Hello")]]),
    );

    expect((await translate(request, deps)).direction).toBeUndefined();
  });

  test("falls back to the next provider when the first is rate limited", async () => {
    const { deps } = dependencies(
      new Map([
        ["groq.test", async () => new Response("slow down", { status: 429 })],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.reason)).toEqual(["rate_limited"]);
  });

  test("skips a provider whose local quota is used up without calling it", async () => {
    const { deps, store, calls } = dependencies(
      new Map([["gemini.test", async () => completionResponse("Hello")]]),
    );
    await store.setItem(usageKey(groq, NOW), "14400");

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.reason)).toEqual(["limit_reached"]);
    expect(calls.map((call) => call.url)).toEqual(["https://gemini.test/v1/chat/completions"]);
  });

  test("falls back when the first provider no longer offers the model", async () => {
    const { deps } = dependencies(
      new Map([
        [
          "groq.test",
          async () => Response.json({ error: { message: "no model" } }, { status: 404 }),
        ],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.summary)).toEqual(["Groq: model unavailable"]);
  });

  test("stops on a non-recoverable error instead of hiding it", async () => {
    const { deps, calls } = dependencies(
      new Map([
        ["groq.test", async () => new Response("bad key", { status: 401 })],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const error = await rejectionOf(translate(request, deps));

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ reason: "unauthorized" });
    expect(calls).toHaveLength(1);
  });

  test("reports every failure when all providers are exhausted", async () => {
    const { deps } = dependencies(
      new Map([
        ["groq.test", async () => new Response("", { status: 429 })],
        ["gemini.test", async () => new Response("", { status: 503 })],
      ]),
    );

    const error = await rejectionOf(translate(request, deps));

    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error).toMatchObject({
      message: "Groq: rate limit reached · Gemini: provider is down",
    });
  });

  test("counts usage against the current day when no clock is given", async () => {
    const { deps, store } = dependencies(
      new Map([["groq.test", async () => completionResponse("Hello")]]),
    );
    setSystemTime(NOW);
    try {
      await translate(request, { providers: deps.providers, store: deps.store, fetch: deps.fetch });
    } finally {
      setSystemTime();
    }

    expect(store.entries.get(usageKey(groq, NOW))).toBe("1");
  });

  test("requires at least one provider", async () => {
    const { deps } = dependencies(new Map(), { providers: [] });

    expect(await rejectionOf(translate(request, deps))).toBeInstanceOf(NoProviderConfiguredError);
  });

  test("rejects blank text before calling any provider", async () => {
    const { deps, calls } = dependencies(new Map());

    expect(await rejectionOf(translate({ ...request, text: "   " }, deps))).toBeInstanceOf(
      EmptyTextError,
    );
    expect(calls).toHaveLength(0);
  });
});
