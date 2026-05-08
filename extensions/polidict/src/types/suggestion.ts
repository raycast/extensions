import type { ItemDefinition } from "./learning-item";

export interface SuggestionTarget {
  type: "EXAMPLE" | "DEFINITION";
  definitionIndex?: number;
}

export interface SuggestionRequest {
  text: string;
  comment?: string;
  definitions?: ItemDefinition[];
  groupIds?: string[];
  suggestionTarget?: SuggestionTarget;
}

export interface SuggestionResponse {
  text: string;
  comment?: string;
  definitions?: ItemDefinition[];
  groupIds?: string[];
}
