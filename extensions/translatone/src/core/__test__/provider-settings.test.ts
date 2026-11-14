import { describe, expect, test } from "bun:test";
import {
  activeProviders,
  createProvider,
  loadProviderSettings,
  removeProvider,
  resetProviderSettings,
  saveProvider,
  setPrimaryProvider,
  setProviderEnabled,
  setProviderFallback,
  testProviderConnection,
  validateBaseUrl,
} from "../provider-settings";
import { MemoryStore, completionResponse, rejectionOf, scriptedFetch } from "./test-helpers";

const draft = {
  id: "groq",
  apiKey: " key ",
  model: " ",
  baseUrl: "",
  enabled: true,
};

describe("managed providers", () => {
  test("starts empty, saves the first provider as primary, and disables fallback", async () => {
    const store = new MemoryStore();
    expect(await loadProviderSettings(store)).toEqual({ providers: [], allowFallback: false });
    const provider = createProvider(draft);
    const saved = await saveProvider(store, provider);
    expect(saved.primary).toBe("groq");
    expect(saved.allowFallback).toBe(false);
    expect(await loadProviderSettings(store)).toEqual(saved);
    expect(activeProviders(saved)).toEqual([provider]);
    expect(provider.apiKey).toBe("key");
  });

  test.each(["", " \n "])("disables a provider with an empty required key %p", (apiKey) => {
    const provider = createProvider({ ...draft, apiKey });
    expect(provider.enabled).toBe(false);
    expect(provider.apiKey).toBeUndefined();
    expect(
      activeProviders({ providers: [provider], primary: "groq", allowFallback: true }),
    ).toEqual([]);
  });

  test.each(["custom", "ollama"])("supports keyless %s", (id) => {
    const provider = createProvider({
      ...draft,
      id,
      apiKey: "",
      model: "local",
      baseUrl: "http://localhost:1234/v1/",
    });
    expect(provider).toMatchObject({
      id,
      enabled: true,
      apiKey: undefined,
      model: "local",
      baseUrl: "http://localhost:1234/v1",
    });
  });

  test("routes only the primary unless fallback is explicitly enabled", async () => {
    const store = new MemoryStore();
    const groq = createProvider(draft);
    const gemini = createProvider({ ...draft, id: "gemini" });
    await saveProvider(store, groq);
    await saveProvider(store, gemini);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([groq]);
    await setPrimaryProvider(store, "gemini");
    expect(activeProviders(await loadProviderSettings(store))).toEqual([gemini]);
    await setProviderFallback(store, true);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([gemini, groq]);
    await setProviderEnabled(store, "groq", false);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([gemini]);
    await setProviderEnabled(store, "groq", true);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([gemini, groq]);
    await setProviderFallback(store, false);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([gemini]);
  });

  test("updates rather than duplicates and clears model overrides on edit and removal", async () => {
    const store = new MemoryStore();
    await saveProvider(store, createProvider(draft));
    await store.setItem("model:groq", "old-model");
    await saveProvider(
      store,
      createProvider({ ...draft, model: "updated", apiKey: "replacement" }),
    );
    const edited = await loadProviderSettings(store);
    expect(edited.providers).toHaveLength(1);
    expect(edited.providers[0]?.model).toBe("updated");
    expect(await store.getItem("model:groq")).toBe("");
    await store.setItem("model:groq", "picked");
    const removed = await removeProvider(store, "groq");
    expect(removed.providers).toEqual([]);
    expect(removed.primary).toBeUndefined();
    expect(await store.getItem("model:groq")).toBe("");
    expect(await store.getItem("providers:v1")).not.toContain("replacement");
  });

  test("does not silently choose another provider when the primary is disabled or removed", async () => {
    const store = new MemoryStore();
    await saveProvider(store, createProvider(draft));
    await saveProvider(store, createProvider({ ...draft, id: "gemini" }));
    await setProviderEnabled(store, "groq", false);
    expect(activeProviders(await loadProviderSettings(store))).toEqual([]);
    await removeProvider(store, "groq");
    expect(activeProviders(await loadProviderSettings(store))).toEqual([]);
    expect((await removeProvider(store, "gemini")).providers).toEqual([]);
  });

  test("rejects missing providers and an unusable primary", async () => {
    const store = new MemoryStore();
    expect(await rejectionOf(setProviderEnabled(store, "groq", true))).toMatchObject({
      message: expect.stringContaining("not found"),
    });
    expect(await rejectionOf(setPrimaryProvider(store, "groq"))).toMatchObject({
      message: expect.stringContaining("enabled"),
    });
    await saveProvider(store, createProvider({ ...draft, apiKey: "" }));
    expect(await rejectionOf(setProviderEnabled(store, "groq", true))).toMatchObject({
      message: expect.stringContaining("API key"),
    });
  });

  test.each([
    "not json",
    "null",
    "[]",
    "{}",
    '{"providers":[],"allowFallback":"yes"}',
    '{"providers":[null],"allowFallback":false}',
    '{"providers":[],"allowFallback":false,"primary":"invalid"}',
    '{"providers":[{"id":"invalid"}],"allowFallback":false}',
  ])("rejects corrupt saved settings without exposing their contents", async (value) => {
    const store = new MemoryStore();
    await store.setItem("providers:v1", value);
    expect(await rejectionOf(loadProviderSettings(store))).toMatchObject({
      message: expect.stringContaining("Manage Providers"),
    });
  });

  test("rejects invalid provider types and incomplete Custom settings", () => {
    expect(() => createProvider({ ...draft, id: "invalid" })).toThrow("provider type");
    expect(() => createProvider({ ...draft, id: "custom", model: "test" })).toThrow("Base URL");
    expect(() =>
      createProvider({ ...draft, id: "custom", baseUrl: "https://example.test/v1" }),
    ).toThrow("Model");
  });

  test("rejects duplicate saved connections instead of choosing one", async () => {
    const store = new MemoryStore();
    const provider = createProvider(draft);
    await store.setItem(
      "providers:v1",
      JSON.stringify({ providers: [provider, provider], allowFallback: false }),
    );
    expect(await rejectionOf(loadProviderSettings(store))).toMatchObject({
      name: "InvalidSettingsError",
    });
  });

  test("explicit reset repairs corrupt settings and clears old model choices", async () => {
    const store = new MemoryStore();
    await store.setItem("providers:v1", "corrupt");
    await store.setItem("model:custom", "old-model");
    await resetProviderSettings(store);
    expect(await loadProviderSettings(store)).toEqual({ providers: [], allowFallback: false });
    expect(await store.getItem("model:custom")).toBe("");
  });

  test("does not send connection tests without a required API key", async () => {
    const { fetch, calls } = scriptedFetch(
      new Map([["api.groq.com", async () => completionResponse("OK")]]),
    );
    expect(
      await rejectionOf(testProviderConnection(fetch, createProvider({ ...draft, apiKey: "" }))),
    ).toMatchObject({ message: expect.stringContaining("API key") });
    expect(calls).toHaveLength(0);
  });

  test.each([
    ["not-a-url", "absolute HTTP or HTTPS URL"],
    ["https://[invalid", "absolute HTTP or HTTPS URL"],
    ["ftp://example.test/v1", "HTTP or HTTPS"],
    ["http://example.test/v1", "HTTPS"],
    ["https://user:password@example.test/v1", "credentials"],
    ["https://example.test/v1?key=secret", "query"],
    ["https://example.test/v1#secret", "fragment"],
    ["https://example.test/v1/chat/completions", "base URL"],
  ])("rejects unsafe endpoint %s", (url, message) => {
    expect(() => validateBaseUrl(url)).toThrow(message);
  });

  test.each([
    "http://localhost:1234/v1",
    "http://127.0.0.1:1234/v1",
    "http://[::1]:1234/v1",
    "https://example.test/v1",
  ])("accepts endpoint %s", (url) => {
    expect(validateBaseUrl(url)).toBe(url);
  });

  test("connection test uses only a synthetic prompt with the selected provider", async () => {
    const provider = createProvider(draft);
    const { fetch, calls } = scriptedFetch(
      new Map([["api.groq.com", async () => completionResponse("OK")]]),
    );
    await testProviderConnection(fetch, provider);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init.body).toContain("Reply with OK");
  });
});
