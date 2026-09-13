import type { AdapterFactory, StreamSource } from "@agentskit/core";
import { gemini, ollama, openrouter } from "@agentskit/adapters";
import { createRuntime } from "@agentskit/runtime";
import type { RunnableAgentDefinition } from "./registry";

export type Provider = "openrouter" | "gemini" | "ollama";

export type ProviderPreferences = {
  openrouterApiKey?: string;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
};

export type RunConfiguration = {
  provider: Provider;
  model: string;
  preferences: ProviderPreferences;
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: "OpenRouter",
  gemini: "Gemini",
  ollama: "Ollama",
};

export const DEFAULT_MODELS: Record<Provider, string> = {
  openrouter: "openrouter/free",
  gemini: "gemini-2.5-flash",
  ollama: "llama3.1",
};

export const RUN_TIMEOUT_MS = 120_000;
export const RUN_MAX_TOKENS = 2_048;

export function isProvider(value: string): value is Provider {
  return value === "openrouter" || value === "gemini" || value === "ollama";
}

export function createProviderAdapter(configuration: RunConfiguration): AdapterFactory {
  const model = configuration.model.trim();
  if (!model) {
    throw new Error("Enter a model before running the agent.");
  }

  switch (configuration.provider) {
    case "openrouter": {
      const apiKey = configuration.preferences.openrouterApiKey?.trim();
      if (!apiKey) {
        throw new Error("Add an OpenRouter API key in the extension preferences.");
      }
      return openrouter({ apiKey, model });
    }
    case "gemini": {
      const apiKey = configuration.preferences.geminiApiKey?.trim();
      if (!apiKey) {
        throw new Error("Add a Gemini API key in the extension preferences.");
      }
      return gemini({ apiKey, model });
    }
    case "ollama":
      return ollama({
        model,
        baseUrl: configuration.preferences.ollamaBaseUrl?.trim() || "http://localhost:11434",
      });
  }
}

export async function runWithAdapter(
  definition: RunnableAgentDefinition,
  task: string,
  adapter: AdapterFactory,
  signal?: AbortSignal,
) {
  if (!task.trim()) {
    throw new Error("Describe a task before running the agent.");
  }

  const runtime = createRuntime({
    adapter: signal ? withAbortSignal(adapter, signal) : adapter,
    systemPrompt: definition.systemPrompt,
    maxSteps: 1,
    maxTokens: RUN_MAX_TOKENS,
  });

  return runtime.run(task.trim(), { signal });
}

export function withAbortSignal(adapter: AdapterFactory, signal: AbortSignal): AdapterFactory {
  return {
    capabilities: adapter.capabilities,
    createSource(request) {
      const source = adapter.createSource(request);
      connectAbortSignal(source, signal);
      return source;
    },
  };
}

function connectAbortSignal(source: StreamSource, signal: AbortSignal): void {
  if (signal.aborted) {
    source.abort();
    return;
  }

  signal.addEventListener("abort", () => source.abort(), { once: true });
}

export async function runPortableAgent(
  definition: RunnableAgentDefinition,
  task: string,
  configuration: RunConfiguration,
  signal?: AbortSignal,
) {
  return runWithAdapter(definition, task, createProviderAdapter(configuration), signal);
}

export function safeErrorMessage(error: unknown, secrets: Array<string | undefined>): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  return message;
}
