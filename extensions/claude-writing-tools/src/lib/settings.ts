import { getPreferenceValues } from "@raycast/api";
import { Effort } from "./claude";
import { DEFAULT_MODEL, isModelId, ModelId } from "./models";
import { LanguagePair } from "./prompts";

export interface Settings {
  apiKey: string;
  /** Chats, questions, screenshots and web pages. */
  model: ModelId;
  /** In-place edits and the live translator. */
  quickModel: ModelId;
  chatEffort: Effort;
  langs: LanguagePair;
  custom: string;
  webSearch: boolean;
  clipboardFallback: boolean;
  keepHistory: boolean;
}

const EFFORTS: Effort[] = ["low", "medium", "high"];

export function settings(): Settings {
  const p = getPreferenceValues<Preferences>();
  const model = isModelId(p.model) ? p.model : DEFAULT_MODEL;
  const primary = p.primaryLanguage || "English";
  // The pair must differ; fall back to a sensible partner if both point at the same language.
  const secondary =
    p.secondaryLanguage && p.secondaryLanguage !== primary
      ? p.secondaryLanguage
      : primary === "English"
        ? "Spanish"
        : "English";
  return {
    apiKey: p.apiKey,
    model,
    quickModel: isModelId(p.quickModel) ? p.quickModel : model,
    chatEffort: EFFORTS.includes(p.chatEffort as Effort) ? (p.chatEffort as Effort) : "medium",
    langs: { primary, secondary },
    custom: p.customInstructions ?? "",
    webSearch: p.webSearch ?? true,
    clipboardFallback: p.clipboardFallback ?? true,
    keepHistory: p.keepHistory ?? true,
  };
}

/** Today's date for prompts, e.g. "Friday, 16 October 2026". */
export function today(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
