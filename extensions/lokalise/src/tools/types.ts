import type { Platform, Translation, Screenshot } from "../types";

export interface ExtractedKey {
  keyName: string;
  translationValue: string;
  description?: string;
  platform: Platform;
}

export interface FormattedKey {
  keyName: string;
  defaultTranslation: string;
  description: string;
  platforms: string[];
  isPlural: boolean;
  tags: string[];
  translations: Array<{
    language: string;
    text: string;
  }>;
}

// Re-export shared types for convenience
export type { Platform, Translation, Screenshot };

export interface KeyDetails {
  keyName: string;
  defaultTranslation: string;
  description: string;
  platforms: string[];
  isPlural: boolean;
  tags: string[];
  context?: string;
  createdAt?: string;
  modifiedAt?: string;
  translations: Translation[];
  screenshots: Screenshot[];
}
