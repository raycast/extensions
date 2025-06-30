/*
 * @author: tisfeng
 * @createTime: 2022-07-25 22:10
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-11 17:59
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { QueryWordInfo } from "../youdao/types";

export interface LingueeDictionaryResult {
  queryWordInfo: QueryWordInfo;
  wordItems: LingueeWordItem[];
  examples: LingueeExample[];
  relatedWords: LingueeWordItem[];
  wikipedias: LingueeWikipedia[];
}

export interface LingueeWordItem {
  word: string;
  title: string;
  featured: boolean;
  pos: string; // part of speech, e.g. noun, verb, adj, etc.
  placeholder: string; // eg. (sth. ~), sth.
  audioUrl: string; // may have value when search English word, there are US and UK audio, we use US audio
  translationItems: LingueeWordExplanation[];
}

export interface LingueeWordExplanation {
  featured?: boolean;
  translation: string;
  pos: string;
  audioUrl: string; // may have value when search Chinese word
  examples: LingueeExample[]; // French: good
  frequencyTag: LingueeFrequencyTag;
}

export interface LingueeFrequencyTag {
  tagForms: string; // (often used), (almost always used), "good" in French: (bonne f sl, bons m pl, bonnes f pl)
  displayType: LingueeListItemType; // as frequency use: AlmostAlways, OfenUsed, Common, LessCommon
}

export interface LingueeExample {
  example: LingueePosText;
  // translation: string;
  // pos: string;
  translations: LingueePosText[];
}

export interface LingueePosText {
  text: string; // good
  pos: string; // adj
}

export interface LingueeWikipedia {
  title: string;
  explanation: string;
  source: string;
  sourceUrl: string;
}

export enum LingueeListItemType {
  AlmostAlwaysUsed = "Almost Always Used", // also featured, eg. true
  OftenUsed = "Often Used", // also featured, eg. good
  Common = "Common", // also featured
  LessCommon = "Less Common", // unfeatured

  SpecialForms = "Forms", // special forms, like often used, but we currently don't handle it. eg. good  English-French

  Unfeatured = "Unfeatured",
  Example = "Example",
  RelatedWord = "Related word", // eg. 优雅, 美丽
  Wikipedia = "Wikipedia", // eg. sql

  Translation = "Translation", // just used for linguee section title item
}
