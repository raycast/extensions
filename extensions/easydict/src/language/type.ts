/*
 * @author: tisfeng
 * @createTime: 2022-08-14 11:50
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-26 23:35
 * @fileName: type.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export interface LanguageItem {
  googleLangCode: string; // ISO 639-1 codes, https://developers.google.com/admin-sdk/directory/v1/languages
  youdaoLangCode: string;
  volcanoLangCode: string; // Volcano language code, https://bytedance.feishu.cn/docx/doxcn5uVWhGLywSN4JsQE0wMzXb
  bingLangCode: string; // Bing language code, https://learn.microsoft.com/zh-cn/azure/cognitive-services/translator/language-support
  appleDetectLangChineseName: string; // such as 中文，英语. ⚠️ Apple detect more languages than apple translate.
  appleLangCode?: string; // used to translate, Apple translate support 12 languages?
  deepLSourceId?: string; // deepL source language id
  deepLTargetId?: string; // most are same as source language, some are different, such as "EN-GB" "EN-US" and so on. ⚠️ "EN" = "EN-US"
  francLangCode: string; // the languages represented by ISO 639-3
  aliyunLangCode: string;
  tencentDetectId?: string; // tencent detect language id, [Japanese is "jp", Korean is "kr"] different from tencentLanguageId
  tencentLangCode?: string;
  baiduLangCode: string;
  caiyunLangCode?: string;
  langEnglishName: string; // eg "English". When system language is English, Apple detect language is equal to languageTitle.
  voiceList?: string[]; // eg. ["Ting-Ting"] for Chinese-Simplified.
  emoji: string; // eg. 🇨🇳
}
