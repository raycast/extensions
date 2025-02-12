/*
 * @author: tisfeng
 * @createTime: 2022-06-15 18:28
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-06-27 11:35
 * @fileName: interface.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export interface IcibaDictionaryResult {
  exchange?: IcibaExchange; // English word part of speech
  is_CRI?: string | number; // has is_CRI when hitting word, is_CRI='1' when word has ph_am ?
  word_name?: string;
  symbols: IcibaSymbol[];
}

export interface IcibaExchange {
  word_done: string[] | string;
  word_er: string[] | string;
  word_est: string[] | string;
  word_ing: string[] | string;
  word_past: string[] | string;
  word_pl: string[] | string;
  word_third: string[] | string;
}

export interface IcibaSymbol {
  word_symbol: string; // Chinese word pronunciation
  symbol_mp3: string; // Chinese word pronunciation audio url
  ph_am: string; // English word pronunciation
  ph_am_mp3: string; // American word pronunciation audio url, maybe empty, then use ph_tts
  ph_tts_mp3: string; // if tts empty, then use ph_en
  ph_en_mp3: string;
  parts: { [key: string]: [value: string | { [key: string]: { value: string | number } }[]] }[]; // word meaning
}

export interface IcibaChinesePart {
  part_name: string;
  means: IcibaChineseMean[];
}

export interface IcibaChineseMean {
  word_mean: string;
  has_mean: string;
  split: number;
}

export interface IcibaEnglishPart {
  part: string;
  means: string[];
}

export enum IcibaExchangeType {
  word_done = "过去分词",
  word_er = "比较级",
  word_est = "最高级",
  word_ing = "现在分词",
  word_past = "过去式",
  word_pl = "复数",
  word_third = "第三人称单数",
}
