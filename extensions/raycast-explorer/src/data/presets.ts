import { AI, Icon } from "@raycast/api";

export type Preset = {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  icon: Icon | string;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
  model: AI.Model;
  web_search?: boolean;
  image_generation?: boolean;
  date: `${number}-${number}-${number}`;
  author?: {
    name: string;
    link?: string;
  };
};

export type PresetCategory = {
  name: string;
  slug: string;
  icon: string;
  presets: Preset[];
};

// TODO: Force AI.Model name when api is updated
export const modelNames: { [key in string]: string } = {
  "openai-gpt-3.5-turbo": "Open AI GPT-3.5 Turbo",
  "openai-gpt-3.5-turbo-instruct": "Open AI GPT-3.5 Turbo Instruct",
  "openai-gpt-4": "Open AI GPT-4",
  "openai-gpt-4-turbo": "Open AI GPT-4 Turbo",
  "anthropic-claude-opus": "Antrophic Claude Opus",
  "anthropic-claude-haiku": "Antrophic Claude Haiku",
  "anthropic-claude-sonnet": "Antrophic Claude Sonnet",
  "perplexity-sonar-small-online": "Perplexity Sonar Small",
  "perplexity-sonar-medium-online": "Perplexity Sonar Medium",
  "groq-mixtral-8x7b-32768": "Mixtral 8x7b",
  "perplexity-codellama-70b-instruct": "Meta Code Llama 70b",
  "groq-llama2-70b-4096": "Meta Llama 2 70b",
  "groq-llama3-70b-8192": "Meta Llama 3 70b",
};
