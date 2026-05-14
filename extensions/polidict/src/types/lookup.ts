import type { ItemDefinition } from "./learning-item";

export type LookupSource = "existing" | "blueprint" | "ai" | "not_found";

export type SuggestedDefinitionsSource = "blueprint" | "ai";

export interface LookupItem {
  id?: string | null;
  text: string;
  comment?: string | null;
  imageUrl?: string | null;
  speechUrl?: string | null;
  definitions: ItemDefinition[];
  groupIds: string[];
}

export interface SuggestedDefinitions {
  source: SuggestedDefinitionsSource;
  definitions: ItemDefinition[];
}

export interface AiPrompt {
  systemMessage: string;
  userMessage: string;
}

export interface LookupResponse {
  source: LookupSource;
  item?: LookupItem | null;
  suggestedDefinitions?: SuggestedDefinitions | null;
  aiPrompt?: AiPrompt | null;
}
