import { describe, expect, test } from "bun:test";
import { ProviderError } from "../errors";
import { applyModelChoices, clearModelChoice, listModels, saveModelChoice } from "../models";
import { MemoryStore, providerConfig, rejectionOf, scriptedFetch } from "./test-helpers";

const openai = providerConfig("openai");

function modelsFetch(response: () => Promise<Response>) {
  return scriptedFetch(new Map([[".test", response]]));
}

async function captureError(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await rejectionOf(promise);
  if (!(error instanceof ProviderError)) {
    throw new Error(`Expected ProviderError, received ${String(error)}`);
  }
  return error;
}

describe("listModels", () => {
  test("redacts credentials from model-list network failures", async () => {
    const provider = providerConfig("custom", {
      baseUrl: "https://user:pass@custom.test/v1?token=secret",
      apiKey: "example-key",
    });
    const error = await captureError(
      listModels(async () => {
        throw new Error("Rejected example-key at https://user:pass@custom.test/v1?token=secret");
      }, provider),
    );

    expect(error.message).toBe("Could not reach https://custom.test/v1.");
    expect(error.cause instanceof Error ? error.cause.message : error.cause).toBe(
      "Rejected [REDACTED] at https://custom.test/v1",
    );
  });
  test("lists the provider's model IDs sorted, from its models endpoint", async () => {
    const { fetch, calls } = modelsFetch(async () =>
      Response.json({ data: [{ id: "gpt-5" }, { id: "gpt-5-mini" }, { id: "dall-e-3" }] }),
    );

    expect(await listModels(fetch, openai)).toEqual(["dall-e-3", "gpt-5", "gpt-5-mini"]);
    expect(calls[0]?.url).toBe("https://openai.test/v1/models");
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[0]?.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer openai-key",
    });
  });

  test("strips Gemini's models/ prefix and drops duplicates", async () => {
    const { fetch } = modelsFetch(async () =>
      Response.json({
        data: [{ id: "models/gemini-2.5-flash" }, { id: "gemini-2.5-flash" }, { id: 42 }, null],
      }),
    );

    expect(await listModels(fetch, providerConfig("gemini"))).toEqual(["gemini-2.5-flash"]);
  });

  test("sends Anthropic's own API key and version headers", async () => {
    const { fetch, calls } = modelsFetch(async () => Response.json({ data: [] }));

    await listModels(fetch, providerConfig("anthropic"));

    expect(calls[0]?.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer anthropic-key",
      "x-api-key": "anthropic-key",
      "anthropic-version": "2023-06-01",
    });
  });

  test("omits the authorization header for a keyless endpoint", async () => {
    const { fetch, calls } = modelsFetch(async () => Response.json({ data: [] }));

    await listModels(fetch, providerConfig("ollama", { apiKey: undefined }));

    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
  });

  test("reports a rejected key with the provider's message and request ID", async () => {
    const { fetch } = modelsFetch(async () =>
      Response.json(
        { error: { message: "Incorrect API key provided" } },
        { status: 401, headers: { "x-request-id": "req_models" } },
      ),
    );

    const error = await captureError(listModels(fetch, openai));

    expect(error).toMatchObject({
      provider: "openai",
      reason: "unauthorized",
      status: 401,
      requestId: "req_models",
      message: "Incorrect API key provided",
    });
  });

  test.each([
    ["an object without data", () => Response.json({ object: "list" })],
    ["a body that is not JSON", () => new Response("<html>Not found</html>")],
  ])("reports %s as an unexpected response", async (_label, respond) => {
    const { fetch } = modelsFetch(async () => respond());

    const error = await captureError(listModels(fetch, openai));

    expect(error).toMatchObject({ provider: "openai", reason: "bad_response", status: 200 });
  });

  test("reports an unreachable endpoint as a network failure", async () => {
    const { fetch } = scriptedFetch(new Map());

    const error = await captureError(listModels(fetch, openai));

    expect(error).toMatchObject({
      provider: "openai",
      reason: "network",
      message: "Could not reach https://openai.test/v1.",
    });
  });
});

describe("model choices", () => {
  const groq = providerConfig("groq");

  test("keep the preference model when nothing was picked", async () => {
    expect(await applyModelChoices(new MemoryStore(), [openai, groq])).toEqual([openai, groq]);
  });

  test("use the picked model for that provider only", async () => {
    const store = new MemoryStore();

    await saveModelChoice(store, "openai", "gpt-5");

    expect(await applyModelChoices(store, [openai, groq])).toEqual([
      { ...openai, model: "gpt-5" },
      groq,
    ]);
  });

  test("go back to the preference model once cleared", async () => {
    const store = new MemoryStore();
    await saveModelChoice(store, "openai", "gpt-5");

    await clearModelChoice(store, "openai");

    expect(await applyModelChoices(store, [openai])).toEqual([openai]);
  });
});
