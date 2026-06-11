import type { GeminiErrorCause } from "./geminiError";
import { MAX_PHRASE_TOKENS, MAX_VOCAB_LENGTH } from "./input";

export type ToastSpec = {
  title: string;
  message: string;
};

/** Single source of truth for user-visible toast copy. See AGENTS.md → Error Handling. */
export function defaultToastFor(cause: GeminiErrorCause): ToastSpec {
  switch (cause.kind) {
    case "network-offline":
      return {
        title: "No internet connection",
        message: "Check your connection and try again.",
      };

    case "invalid-api-key":
      return {
        title: "Invalid Gemini API key",
        message: "Update your key in extension preferences.",
      };

    case "model-not-found": {
      const prefName = cause.surface === "tts" ? "Text-to-Speech Model" : "Translation Model";
      const verb = cause.surface === "tts" ? "TTS" : "Translation";
      const model = cause.model ?? "the configured model";
      return {
        title: `${verb} model not found`,
        message: `Model "${model}" is unavailable. Update "${prefName}" in extension preferences.`,
      };
    }

    case "request-failed": {
      const title = cause.surface === "tts" ? "Pronunciation request failed" : "Translation failed";
      const message =
        typeof cause.status === "number"
          ? `Gemini returned ${cause.status}. Please try again.`
          : "Gemini request failed. Please try again.";
      return { title, message };
    }

    case "empty-response":
      return {
        title: cause.surface === "tts" ? "No audio returned" : "Empty response from Gemini",
        message: "Try again or pick a different model in preferences.",
      };

    case "invalid-response":
      return {
        title: "Unexpected response from Gemini",
        message: "Gemini returned an unrecognized format. Try again or pick a different model.",
      };

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
