// To parse this data:
//
//   import { Convert, YoudaoTranslateResponse } from "./file";
//
//   const youdaoTranslateResponse = Convert.toYoudaoTranslateResponse(json);

export interface TranslateParams {
  keyid: string;
  client: string;
  product: string;
  appVersion: string;
  vendor: string;
  pointParam: string;
  mysticTime: string;
  keyfrom: string;
  sign: string;
  i?: string; // 翻译文本
  from?: string; // 源语言
  to?: string; // 目标语言
  dictResult?: string;
}

export interface YoudaoTranslateResponse {
  code: number;
  dictResult: DictResult;
  translateResult: Array<TranslateResult[]>;
  type: string;
}

export interface DictResult {
  ce: Ce;
}

export interface Ce {
  word: Word;
}

export interface Word {
  trs: Tr[];
  "return-phrase": string;
}

export interface Tr {
  voice: string;
  "#text": string;
  "#tran": string;
}

export interface TranslateResult {
  tgt: string;
  src: string;
  srcPronounce: string;
}
