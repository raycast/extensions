import { expect, test } from "bun:test";
import { runTranslationAttempt, startTranslationAttempt } from "../translation-attempt";
import { translationKey } from "../detail";
import { DEFAULT_LANGUAGE } from "../languages";
import { providersAfter } from "../providers";
import {
  MemoryStore,
  completionResponse,
  providerConfig,
  rejectionOf,
  scriptedFetch,
  streamResponse,
  sseEvent,
} from "./test-helpers";
import type { TranslationRequest, TranslationResult } from "../translate";

const request: TranslationRequest = {
  text: "Halo",
  tone: "default",
  target: { kind: "fixed", language: DEFAULT_LANGUAGE },
};

test("normal retry restores all providers and bypasses a cached result after an alternate fails", async () => {
  const providers = [providerConfig("groq"), providerConfig("gemini")];
  const { fetch, calls } = scriptedFetch(
    new Map([
      ["groq.test", async () => completionResponse("Hello")],
      ["gemini.test", async () => new Response("Unavailable", { status: 401 })],
    ]),
  );
  const dependencies = { providers, fetch, store: new MemoryStore() };
  const cache = new Map<string, TranslationResult>();
  const initial = await runTranslationAttempt(request, dependencies, cache, undefined);
  cache.set(initial.key, initial.result);
  const alternate = startTranslationAttempt(initial.key, providersAfter(providers, "groq"), undefined);
  expect(await rejectionOf(runTranslationAttempt(request, dependencies, cache, alternate))).toBeInstanceOf(Error);
  const retry = startTranslationAttempt(initial.key, providers, alternate);
  const recovered = await runTranslationAttempt(request, dependencies, cache, retry);
  expect(recovered.result.provider.id).toBe("groq");
  expect(recovered.generation).toBe(2);
  expect(calls.map(({ url }) => new URL(url).hostname)).toEqual(["groq.test", "gemini.test", "groq.test"]);
});

test("uses cached translations for normal requests and ignores retries belonging to another query", async () => {
  const providers = [providerConfig("groq")];
  const { fetch, calls } = scriptedFetch(new Map([["groq.test", async () => completionResponse("Hello")]]));
  const dependencies = { providers, fetch, store: new MemoryStore() };
  const initial = await runTranslationAttempt(request, dependencies, new Map(), undefined);
  const cache = new Map([[initial.key, initial.result]]);
  const unrelated = startTranslationAttempt("another query", [], undefined);
  expect(await runTranslationAttempt(request, dependencies, cache, unrelated)).toEqual(initial);
  expect(initial.key).toBe(translationKey(request.text, request.target, request.tone, providers));
  expect(calls).toHaveLength(1);
});

test("forwards streamed text and cancellation without changing the successful cache", async () => {
  const controller = new AbortController();
  const partials: string[] = [];
  const cache = new Map<string, TranslationResult>();
  const providers = [providerConfig("groq")];
  const pending = runTranslationAttempt(
    {
      ...request,
      signal: controller.signal,
      onPartial: (partial) => {
        partials.push(partial.text);
        controller.abort(new DOMException("Cancelled", "AbortError"));
      },
    },
    {
      providers,
      store: new MemoryStore(),
      fetch: async (_url, init) => streamResponse({ chunks: [sseEvent("Hello")], ending: "hang", signal: init.signal }),
    },
    cache,
    undefined,
  );
  expect(await rejectionOf(pending)).toMatchObject({ name: "AbortError" });
  expect(partials).toEqual(["Hello"]);
  expect(cache.size).toBe(0);
});
