import type { AdapterFactory, AdapterRequest } from "@agentskit/core";
import { describe, expect, it } from "vitest";
import {
  createProviderAdapter,
  isProvider,
  runWithAdapter,
  safeErrorMessage,
  withAbortSignal,
  type RunConfiguration,
} from "./runtime";

const definition = {
  id: "writer",
  title: "Writer",
  systemPrompt: "Write with precision.",
};

describe("provider configuration", () => {
  it("requires an OpenRouter API key", () => {
    const configuration: RunConfiguration = {
      provider: "openrouter",
      model: "openrouter/free",
      preferences: {},
    };
    expect(() => createProviderAdapter(configuration)).toThrow("OpenRouter API key");
  });

  it("requires a Gemini API key", () => {
    const configuration: RunConfiguration = {
      provider: "gemini",
      model: "gemini-2.5-flash",
      preferences: {},
    };
    expect(() => createProviderAdapter(configuration)).toThrow("Gemini API key");
  });

  it("creates an Ollama adapter without an API key", () => {
    const configuration: RunConfiguration = {
      provider: "ollama",
      model: "llama3.1",
      preferences: {},
    };
    expect(createProviderAdapter(configuration)).toBeDefined();
  });

  it("creates configured OpenRouter and Gemini adapters", () => {
    expect(
      createProviderAdapter({
        provider: "openrouter",
        model: "openrouter/free",
        preferences: { openrouterApiKey: "openrouter-key" },
      }),
    ).toBeDefined();
    expect(
      createProviderAdapter({
        provider: "gemini",
        model: "gemini-2.5-flash",
        preferences: { geminiApiKey: "gemini-key" },
      }),
    ).toBeDefined();
  });

  it("rejects an empty model and recognizes supported providers", () => {
    expect(() =>
      createProviderAdapter({
        provider: "ollama",
        model: " ",
        preferences: {},
      }),
    ).toThrow("Enter a model");
    expect(isProvider("openrouter")).toBe(true);
    expect(isProvider("unknown")).toBe(false);
  });

  it("redacts provider secrets from errors", () => {
    expect(safeErrorMessage(new Error("request failed for secret-key"), ["secret-key"])).toBe(
      "request failed for [redacted]",
    );
    expect(safeErrorMessage("plain failure", [undefined])).toBe("plain failure");
  });
});

describe("portable runtime", () => {
  it("runs the task with the registry system prompt", async () => {
    let request: AdapterRequest | undefined;
    const adapter: AdapterFactory = {
      createSource(nextRequest) {
        request = structuredClone(nextRequest);
        return {
          async *stream() {
            yield { type: "text" as const, content: "Portable result" };
            yield { type: "done" as const };
          },
          abort() {},
        };
      },
    };

    const result = await runWithAdapter(definition, "Draft a launch note", adapter);

    expect(result.content).toBe("Portable result");
    expect(result.steps).toBe(1);
    expect(request?.messages).toEqual([
      expect.objectContaining({ role: "system", content: "Write with precision." }),
      expect.objectContaining({ role: "user", content: "Draft a launch note" }),
    ]);
    expect(request?.context?.maxTokens).toBe(2_048);
  });

  it("rejects an empty task before calling the provider", async () => {
    const adapter: AdapterFactory = {
      createSource() {
        throw new Error("should not be called");
      },
    };

    await expect(runWithAdapter(definition, "  ", adapter)).rejects.toThrow("Describe a task");
  });

  it("aborts the provider stream when the run signal is cancelled", () => {
    let aborted = false;
    const adapter: AdapterFactory = {
      createSource() {
        return {
          async *stream() {
            yield { type: "done" as const };
          },
          abort() {
            aborted = true;
          },
        };
      },
    };
    const controller = new AbortController();
    const source = withAbortSignal(adapter, controller.signal).createSource({ messages: [] });

    expect(aborted).toBe(false);
    controller.abort();
    expect(aborted).toBe(true);
    expect(source).toBeDefined();
  });

  it("aborts a provider stream immediately when the signal is already cancelled", () => {
    let aborted = false;
    const adapter: AdapterFactory = {
      createSource() {
        return {
          async *stream() {
            yield { type: "done" as const };
          },
          abort() {
            aborted = true;
          },
        };
      },
    };
    const controller = new AbortController();
    controller.abort();

    withAbortSignal(adapter, controller.signal).createSource({ messages: [] });
    expect(aborted).toBe(true);
  });
});
