/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { QueryWordInfo } from "@/core/results/types";

export interface TranslationContent {
  readonly kind: "translation";
  readonly query: QueryWordInfo;
  readonly paragraphs: readonly string[];
}

export interface DictionaryContent {
  readonly kind: "dictionary";
  readonly query: QueryWordInfo;
  readonly sections: readonly DictionarySection[];
}

export type ProviderContent = TranslationContent | DictionaryContent;

export interface ContentExample {
  readonly sentence: string;
  readonly translation?: string;
  readonly partOfSpeech?: string;
}

export type ContentDefinition =
  | { readonly kind: "plain"; readonly text: string; readonly note?: string }
  | {
      readonly kind: "structured";
      readonly meanings: readonly string[];
      readonly partOfSpeech?: string;
      readonly explanation?: string;
      readonly examples: readonly ContentExample[];
    };

export interface ContentEquivalent {
  readonly text: string;
  readonly partOfSpeech?: string;
  readonly prominent: boolean;
  readonly frequency: "common" | "often" | "almost-always" | "less-common" | "special-forms";
  readonly inflectionNote?: string;
  readonly firstExampleTranslation?: string;
}

export type DictionarySection =
  | {
      readonly kind: "translation";
      readonly text: string;
      readonly lemma?: string;
      /** Entry-specific pronunciation; does not change the query's cross-service metadata. */
      readonly pronunciation?: string;
    }
  | {
      readonly kind: "equivalents";
      readonly headword: {
        readonly word: string;
        readonly qualifier?: string;
        readonly partOfSpeech?: string;
      };
      readonly entries: readonly ContentEquivalent[];
    }
  | { readonly kind: "definitions"; readonly entries: readonly ContentDefinition[] }
  | {
      readonly kind: "pairs";
      readonly relation: "form" | "phrase" | "related" | "web-translation";
      readonly entries: readonly {
        readonly expression: string;
        readonly meaning: string;
        readonly partOfSpeech?: string;
      }[];
    }
  | { readonly kind: "form-set"; readonly forms: readonly { readonly label: string; readonly value: string }[] }
  | { readonly kind: "examples"; readonly entries: readonly ContentExample[] }
  | {
      readonly kind: "summary";
      readonly source: "encyclopedia" | "wikipedia";
      readonly entries: readonly { readonly subject: string; readonly text: string }[];
    }
  | {
      readonly kind: "chinese-entry";
      readonly entries: readonly {
        readonly pronunciation?: string;
        readonly summary: string;
        readonly markdown: string;
      }[];
    };

/**
 * Applies only to the first section's first row. A phonetic or nonempty examTypes
 * replaces both metadata fields together, including the missing companion field.
 */
export interface PrimarySupplement {
  readonly translation?: string;
  readonly phonetic?: string;
  readonly examTypes?: readonly string[];
}
