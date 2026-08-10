export interface BlueprintItemDefinition {
  definition: string;
  comment?: string;
  examples?: string[];
  translationByLanguageCode?: Record<string, string>;
}

export interface BlueprintLearningItem {
  id: string;
  languageCode: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions: BlueprintItemDefinition[];
}

export interface SingleLanguageBlueprintItemDefinition {
  definition: string;
  translation?: string;
  comment?: string;
  examples?: string[];
}

export interface SingleLanguageBlueprintLearningItem {
  id: string;
  languageCode: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions: SingleLanguageBlueprintItemDefinition[];
}
