import { Icon } from "@raycast/api";
import { PromptProfile, ProviderId, TranslationStyle } from "./types";

export const PROVIDER_ICONS: Record<ProviderId, Icon> = {
  deepseek: Icon.Waveform,
  mimo: Icon.AppWindowGrid2x2,
  gemini: Icon.Stars,
  kimi: Icon.Moon,
  openai: Icon.Message,
};

export const PROMPT_PROFILE_LABELS: Record<PromptProfile, string> = {
  screenshot: "Screenshot OCR",
  general: "General",
  technical: "Technical",
  academic: "Academic",
  legal: "Legal",
  subtitle: "Subtitle",
  custom: "Custom",
};

export const STYLE_LABELS: Record<TranslationStyle, string> = {
  balanced: "Balanced",
  faithful: "Faithful",
  polished: "Polished",
  academic: "Academic",
};

export function quoted(text: string): string {
  return text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
}

export function normalizeInputText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 12000);
}
