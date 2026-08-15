/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryType, TranslationType } from "./api";
import type { DisplaySection } from "./display";

/**
 * Runtime execution options for a query.
 * Passed separately from the data payload (QueryInput).
 */
export interface RequestOptions {
  signal?: AbortSignal;
}

export interface StreamChunk {
  content: string;
  role?: string;
}

export interface QueryInput {
  readonly word: string;
  readonly fromLanguage: string; // ! must be Youdao language id.
  readonly toLanguage: string;
  readonly isWord?: boolean; // * Dictionary Type should has value, show web url need this value.
}

export interface QueryWordInfo extends QueryInput {
  phonetic?: string; // [ɡʊd]
  examTypes?: string[];
  speechUrl?: string; // word audio url. some language not have tts url, such as "ຂາດ"
}

export type QueryType = TranslationType | DictionaryType;

interface ProviderResult<T, TType extends QueryType> {
  type: TType;
  queryWordInfo: QueryWordInfo;
  result?: T;
}

export interface TranslationResult<T = unknown> extends ProviderResult<T, TranslationType> {
  translations: string[];
}

export interface DictionaryResult<T = unknown> extends ProviderResult<T, DictionaryType> {
  displaySections?: DisplaySection[];
}

export interface TranslationQueryResult<T = unknown> extends TranslationResult<T> {
  displaySections: DisplaySection[];
  hideDisplay: boolean;
}

export interface DictionaryQueryResult<T = unknown> extends DictionaryResult<T> {
  displaySections: DisplaySection[];
}

export type QueryResult<T = unknown> = TranslationQueryResult<T> | DictionaryQueryResult<T>;
