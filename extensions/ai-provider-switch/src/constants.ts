import { Abilities } from "./types";

export const DEFAULT_PROVIDERS_PATH = "~/.config/raycast/ai/providers.yaml";

export const ABILITY_TEMPLATES: Record<
  string,
  { label: string; abilities: Abilities }
> = {
  full: {
    label: "Full",
    abilities: {
      temperature: { supported: true },
      vision: { supported: true },
      system_message: { supported: true },
      tools: { supported: true },
      reasoning_effort: { supported: true },
    },
  },
  basic: {
    label: "Basic",
    abilities: {
      temperature: { supported: true },
      vision: { supported: false },
      system_message: { supported: true },
      tools: { supported: false },
      reasoning_effort: { supported: false },
    },
  },
  tools: {
    label: "Tools",
    abilities: {
      temperature: { supported: true },
      vision: { supported: true },
      system_message: { supported: true },
      tools: { supported: true },
      reasoning_effort: { supported: false },
    },
  },
};

export const DEFAULT_CONTEXT = 128000;

export const API_TIMEOUT = 5000;
