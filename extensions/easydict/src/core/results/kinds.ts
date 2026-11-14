/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export enum TranslationType {
  Youdao = "Youdao Translate",
  Baidu = "Baidu Translate",
  /** Stored in favorites created with Tencent Cloud TMT. */
  Tencent = "Tencent Translate",
  Caiyun = "Caiyun Translate",
  Apple = "Apple Translate",
  DeepL = "DeepL Translate",
  DeepLX = "DeepLX Translate",
  Google = "Google Translate",
  Bing = "Bing Translate",
  Volcano = "Volcano Translate",
  OpenAI = "OpenAI Translate",
  Gemini = "Gemini Translate",
}

export enum DictionaryType {
  Youdao = "Youdao Dictionary",
  Eudic = "Eudic Dictionary",
  Linguee = "Linguee Dictionary",
  Wiktionary = "Wiktionary Dictionary",
  AI = "AI Dictionary",
}

export enum LanguageDetectType {
  Simple = "Simple Detect",
  Franc = "Franc Detect",
  /** Stored in detection cache entries created with Tencent Cloud TMT. */
  Tencent = "Tencent Detect",
  Baidu = "Baidu Detect",
  Bing = "Bing Detect",
  Volcano = "Volcano Detect",
}

export type RequestType = TranslationType | DictionaryType | LanguageDetectType;
