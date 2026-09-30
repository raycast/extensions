/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export interface LanguageItem {
  googleLangCode: string; // ISO 639-1 codes, https://developers.google.com/admin-sdk/directory/v1/languages
  youdaoLangCode: string; // youdao language code, https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html
  volcanoLangCode: string; // Volcano language code, https://bytedance.feishu.cn/docx/doxcn5uVWhGLywSN4JsQE0wMzXb
  bingLangCode: string; // Bing language code, https://learn.microsoft.com/zh-cn/azure/cognitive-services/translator/language-support
  appleLangCode?: string; // used to translate, Apple translate support 12 languages?
  deepLSourceId?: string; // deepL source language code, https://www.deepl.com/zh/docs-api/translate-text/
  deepLTargetId?: string; // most are same as source language, some are different, such as "EN-GB" "EN-US" and so on. ⚠️ "EN" = "EN-US"
  francLangCode: string; // the languages represented by ISO 639-3
  aliyunLangCode?: string; // Aliyun language code, https://help.aliyun.com/document_detail/158269.html?spm=a2c4g.11186623.0.0.4a142e50drwsIW
  tencentDetectCode?: string; // tencent detect language code, [Japanese is "jp", Korean is "kr"] different from tencentLanguageId. https://cloud.tencent.com/document/product/551/15620
  tencentLangCode?: string; // tencent translate language code, https://cloud.tencent.com/document/product/551/15619
  baiduLangCode?: string; // baidu language code, https://fanyi-api.baidu.com/doc/21
  caiyunLangCode?: string;
  langEnglishName: string; // eg "English"
  langChineseName: string; // eg "英语"
  voiceList?: { macOS?: string[]; Windows?: string[] }; // eg. { macOS: ["TingTing"] } for Chinese-Simplified.
  emoji: string; // eg. 🇨🇳
}
