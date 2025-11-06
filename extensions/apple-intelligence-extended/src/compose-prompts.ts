export interface ComposePrompt {
  key: string;
  title: string;
  prompt: string;
  icon: string;
}

export const COMPOSE_PROMPTS: Record<string, ComposePrompt> = {
  PORTUGUESE: {
    key: "PORTUGUESE",
    title: "Compose in Portuguese",
    prompt: "Write this in portuguese Portugal",
    icon: "🇵🇹",
  },
  GERMAN_AUSTRIA: {
    key: "GERMAN_AUSTRIA",
    title: "Compose in German (Austria)",
    prompt: "Write this in German Austria",
    icon: "🇦🇹",
  },
  SPANISH: {
    key: "SPANISH",
    title: "Compose in Spanish",
    prompt: "Write this in Spanish",
    icon: "🇪🇸",
  },
  FRENCH: {
    key: "FRENCH",
    title: "Compose in French",
    prompt: "Write this in French",
    icon: "🇫🇷",
  },
  ITALIAN: {
    key: "ITALIAN",
    title: "Compose in Italian",
    prompt: "Write this in Italian",
    icon: "🇮🇹",
  },
};

export function getComposePrompt(key: string): ComposePrompt | undefined {
  return COMPOSE_PROMPTS[key];
}
