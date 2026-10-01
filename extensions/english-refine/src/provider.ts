import OpenAI from "openai";

export interface ProviderConfiguration {
  apiKey: string;
  baseUrl: string;
}

export function createProvider(configuration: ProviderConfiguration) {
  const apiKey = configuration.apiKey.trim();
  if (!apiKey) throw new Error("Set your API key in extension preferences.");

  let baseURL: URL;
  try {
    baseURL = new URL(configuration.baseUrl.trim());
  } catch {
    throw new Error("Set a valid API base URL in extension preferences.");
  }
  if (
    !["https:", "http:"].includes(baseURL.protocol) ||
    baseURL.username ||
    baseURL.password ||
    baseURL.search ||
    baseURL.hash
  ) {
    throw new Error("Use an HTTP(S) API base URL without credentials, query parameters, or fragments.");
  }

  return new OpenAI({
    apiKey,
    baseURL: baseURL.href.replace(/\/+$/, ""),
    organization: null,
    project: null,
    timeout: 60_000,
    maxRetries: 0,
    logLevel: "off",
  });
}

export function providerError(error: unknown, signal?: AbortSignal): Error {
  if (signal?.aborted && error instanceof Error) return error;
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new Error("The provider took too long to respond. Try again or choose a faster model.");
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new Error("Could not connect to the provider. Check your API base URL and network connection.");
  }
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
      case 403:
        return new Error("The provider rejected access. Check your API key and model permissions.");
      case 404:
        return new Error("The API endpoint or model was not found. Check your API base URL and selected model.");
      case 429:
        return new Error("The provider's rate limit or quota was reached. Check your account or try again later.");
      case 400:
      case 422:
        return new Error("The provider rejected the request. Check model compatibility or try a shorter selection.");
      default:
        return new Error("The provider could not complete the request. Try again later.");
    }
  }
  return new Error("Could not read the provider's response. Check that it supports the OpenAI API format.");
}
