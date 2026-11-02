import type { ProviderErrorCause, ProviderInfrastructureCause } from "./providerError";
import { MAX_PHRASE_TOKENS, MAX_VOCAB_LENGTH } from "./input";
import { providerLabel } from "./providers";

export type ToastSpec = {
  title: string;
  message: string;
};

const URL_RULES = "Use https, or http only for localhost, without embedded credentials.";

function labelFor(provider: ProviderInfrastructureCause["provider"]): string {
  return provider === "unknown" ? "the API server" : providerLabel(provider);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Single source of truth for user-visible toast copy. See AGENTS.md → Error Handling. */
export function defaultToastFor(cause: ProviderErrorCause): ToastSpec {
  if (cause.domain === "outcome") {
    switch (cause.kind) {
      case "word-not-found":
        return {
          title: "Word not recognized",
          message: "This word or phrase was not recognized. Check the spelling or try something else.",
        };

      case "invalid-word-input":
        return {
          title: "Translation failed",
          message: `Enter a word or short phrase (letters, apostrophe, hyphen; up to ${MAX_PHRASE_TOKENS} words, ${MAX_VOCAB_LENGTH} chars).`,
        };

      case "invalid-text-input":
        return {
          title: "Translation failed",
          message: "Text is empty or too long.",
        };
    }
  }

  const label = labelFor(cause.provider);
  const namedProvider = cause.provider !== "unknown" && cause.provider !== "openai-compatible";

  switch (cause.kind) {
    case "network-offline":
      return {
        title: "No internet connection",
        message: "Check your connection and try again.",
      };

    case "invalid-api-key":
      return {
        title: namedProvider ? `Invalid ${label} API key` : "API key rejected",
        message: 'Update "API Key" in extension preferences.',
      };

    case "model-not-found": {
      const prefName = cause.surface === "tts" ? "Text-to-Speech Model" : "Translation Model";
      const verb = cause.surface === "tts" ? "TTS" : "Translation";
      const model = cause.model ?? "the configured model";
      // A custom endpoint makes 404 ambiguous — the model may be fine and the
      // base URL wrong — so name both preferences rather than sending the user
      // to cycle through models that were never the problem.
      const message = cause.endpointHost
        ? `Model "${model}" or its endpoint was not found at ${cause.endpointHost}. Check "${prefName}" and "API Server URL" in extension preferences.`
        : `Model "${model}" is unavailable. Update "${prefName}" in extension preferences.`;
      const title = cause.endpointHost ? `${verb} model or endpoint not found` : `${verb} model not found`;
      return { title, message };
    }

    case "invalid-base-url":
      return {
        title: "Invalid API URL",
        message:
          cause.provider === "openai-compatible"
            ? `OpenAI-compatible servers need a valid "API Server URL" in extension preferences. ${URL_RULES}`
            : `Check "API Server URL" in extension preferences. ${URL_RULES}`,
      };

    case "provider-undetected":
      return {
        title: "Choose a provider",
        message: "The API key format wasn't recognized. Pick a provider in extension preferences.",
      };

    case "missing-model":
      return {
        title: "Model required",
        message: 'OpenAI-compatible servers need "Translation Model" set in extension preferences.',
      };

    case "request-failed": {
      const title = cause.surface === "tts" ? "Pronunciation request failed" : "Translation failed";
      const message =
        typeof cause.status === "number"
          ? `${capitalize(label)} returned ${cause.status}. Please try again.`
          : `${capitalize(label)} request failed. Please try again.`;
      return { title, message };
    }

    case "empty-response":
      return {
        title: cause.surface === "tts" ? "No audio returned" : `Empty response from ${label}`,
        message: "Try again or pick a different model in preferences.",
      };

    case "invalid-response":
      return {
        title: `Unexpected response from ${label}`,
        message: `${capitalize(label)} returned an unrecognized format. Try again or pick a different model.`,
      };
  }
}
