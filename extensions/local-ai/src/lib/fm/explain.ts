import type { FmError } from "./errors";

export interface FmErrorExplanation {
  title: string;
  explanation: string;
}

const CHECK_SETUP_HINT = "Open Check Setup to fix this.";
const MODEL_ERROR_EXPLANATION = "The on-device model returned an error.";
const OVERFLOW_BASE_EXPLANATION =
  "The on-device model handles about 4,096 tokens per request, counting the text and the answer together.";
const OVERFLOW_SINGLE_EXPLANATION = `${OVERFLOW_BASE_EXPLANATION} Try shorter text or ask for a shorter answer.`;
const OVERFLOW_CHAT_EXPLANATION = `${OVERFLOW_BASE_EXPLANATION} Try shorter text, ask for a shorter answer, or start a new chat.`;
const STOPPED_TITLE = "Stopped";

export interface ExplainOptions {
  surface?: "chat" | "single";
}

export function explainFmError(error: FmError, options: ExplainOptions = {}): FmErrorExplanation {
  switch (error.kind) {
    case "contextOverflow":
      return {
        title: error.message,
        explanation: options.surface === "chat" ? OVERFLOW_CHAT_EXPLANATION : OVERFLOW_SINGLE_EXPLANATION,
      };
    case "timeout":
      return { title: "Timed out", explanation: error.message };
    case "guardrail":
      return {
        title: "Stopped by the safety filter",
        explanation: "The on-device model's safety filter stopped this answer. Rephrasing your request can help.",
      };
    case "aborted":
      return { title: STOPPED_TITLE, explanation: "You stopped the answer." };
    case "notInstalled":
    case "license":
    case "unavailable":
      return { title: error.message, explanation: CHECK_SETUP_HINT };
    case "invalidModel":
    case "unknown":
      return { title: error.message, explanation: modelErrorExplanation(error) };
  }
}

function modelErrorExplanation(error: FmError): string {
  const firstLine = error.detail?.split("\n")[0].trim();
  return firstLine ? `${MODEL_ERROR_EXPLANATION} ${firstLine}` : MODEL_ERROR_EXPLANATION;
}

export function errorBlockMarkdown(title: string, explanation?: string): string {
  const heading = title === STOPPED_TITLE ? "**Stopped**" : `**Stopped: ${title}**`;
  return explanation ? `> ${heading}\n> ${explanation}` : `> ${heading}`;
}
