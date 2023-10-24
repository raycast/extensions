export interface OpenInterpreterPreferences {
  "openinterpreter-api-key": string;
  "openinterpreter-model": Model;
  "openinterpreter-budget"?: number;
  "openinterpreter-base-url"?: string;
}

export enum Model {
  GPT4 = "gpt-4",
  GPT432K = "gpt-4-32k",
  GPT35Turbo = "gpt-3.5-turbo",
  GPT3516K = "gpt-3.5-turbo-16k",
  Claude1 = "claude-instant-1",
  Claude11 = "claude-instant-1.1",
  Claude2 = "claude-instant-2",
}

export enum Company {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export function ModelToCompany(model: Model): Company {
  switch (model) {
    case Model.GPT4:
    case Model.GPT432K:
    case Model.GPT35Turbo:
    case Model.GPT3516K:
      return Company.OpenAI;
    case Model.Claude1:
    case Model.Claude11:
    case Model.Claude2:
      return Company.Anthropic;
  }
}

function OpenAEnvVars(model: Model, apiKey: string, baseUrl?: string): Record<string, string> {
  const env: Record<string, string> = {
    OPENAI_API_KEY: apiKey,
    MODEL: model,
  };

  if (baseUrl) {
    env["OPENAI_API_BASE"] = baseUrl;
  }

  return env;
}

function AnthropicEnvVars(model: Model, apiKey: string, baseUrl?: string): Record<string, string> {
  const env: Record<string, string> = {
    ANTHROPIC_API_KEY: apiKey,
    MODEL: model,
  };

  if (baseUrl) {
    env["ANTHROPIC_API_BASE"] = baseUrl;
  }

  return env;
}

export function ModelToEnvVars(model: Model, apiKey: string, baseUrl?: string): Record<string, string> {
  switch (ModelToCompany(model)) {
    case Company.OpenAI:
      return OpenAEnvVars(model, apiKey, baseUrl);
    case Company.Anthropic:
      return AnthropicEnvVars(model, apiKey, baseUrl);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}
