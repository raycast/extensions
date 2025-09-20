/*
 * @author: tisfeng
 * @createTime: 2022-08-05 10:36
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-31 16:04
 * @fileName: preferences.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment, getPreferenceValues } from "@raycast/api";
import CryptoJS from "crypto-js";
import { getLanguageItemFromYoudaoCode } from "./language/languages";

export const myPreferences: MyPreferences = getPreferenceValues();
export const preferredLanguage1 = getLanguageItemFromYoudaoCode(myPreferences.language1);
export const preferredLanguage2 = getLanguageItemFromYoudaoCode(myPreferences.language2);
export const preferredLanguages = [preferredLanguage1, preferredLanguage2];
// console.log("myPreferences: ", myPreferences);

export interface MyPreferences {
  language1: string;
  language2: string;
  enableAutomaticQuerySelectedText: boolean;
  enableAutomaticPlayWordAudio: boolean;
  enableSelectTargetLanguage: boolean;
  servicesOrder: string;
  showOpenInEudicFirst: boolean;
  enableSystemProxy: boolean;
  enableDetectLanguageSpeedFirst: boolean;
  enableBaiduLanguageDetect: boolean;

  enableYoudaoDictionary: boolean;
  enableYoudaoTranslate: boolean;

  enableLingueeDictionary: boolean;

  enableDeepLTranslate: boolean;
  deepLAuthKey: string;
  deepLEndpoint: string;

  enableDeepLXTranslate: boolean;

  enableGoogleTranslate: boolean;

  enableBingTranslate: boolean;

  enableBaiduTranslate: boolean;
  baiduAppId: string;
  baiduAppSecret: string;

  enableTencentTranslate: boolean;
  tencentSecretId: string;
  tencentSecretKey: string;

  enableAppleTranslate: boolean;

  enableCaiyunTranslate: boolean;
  caiyunToken: string;

  enableVolcanoTranslate: boolean;
  volcanoAccessKeyId: string;
  volcanoAccessKeySecret: string;

  enableOpenAITranslate: boolean;
  openAIAPIKey: string;
  openAIAPIURL: string;
  openAIModel: string;

  enableGeminiTranslate: boolean;
  geminiAPIKey: string;
  geminiAPIURL: string;
  geminiModel: string;

  bingHost: string;
}

/**
 * Service keys.
 *
 * * NOTE: Please apply for your own keys as much as possible. Please do not abuse them, otherwise I have to revoke them 😑。
 */
export class AppKeyStore {
  static deepLAuthKey = myPreferences.deepLAuthKey.trim();
  static deepLEndpoint = myPreferences.deepLEndpoint.trim();

  // This is a official test token from https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
  private static defaultEncryptedCaiyunToken = "U2FsdGVkX1+RTgfMmgZgkD1Phn4FyvzMiMed5BvxnjoqS8QIJ/AFjUJdfC7OqjU3";
  private static defaultCaiyunToken = myDecrypt(this.defaultEncryptedCaiyunToken);
  static caiyunToken = myPreferences.caiyunToken.trim() || this.defaultCaiyunToken;

  // baidu app id and secret
  static baiduAppId = myPreferences.baiduAppId.trim();
  static baiduAppSecret = myPreferences.baiduAppSecret.trim();

  // tencent secret id and key
  static tencentSecretId = myPreferences.tencentSecretId.trim();
  static tencentSecretKey = myPreferences.tencentSecretKey.trim();

  static volcanoSecretId = myPreferences.volcanoAccessKeyId.trim();
  static volcanoSecretKey = myPreferences.volcanoAccessKeySecret.trim();

  static openAIAPIKey = myPreferences.openAIAPIKey.trim();
  static openAIEndpoint = myPreferences.openAIAPIURL.trim() || "https://api.openai.com/v1/chat/completions";
  static openAIModel = myPreferences.openAIModel.trim() || "gpt-3.5-turbo";

  static geminiAPIKey = myPreferences.geminiAPIKey.trim();
  static geminiEndpoint = myPreferences.geminiAPIURL.trim() || "https://generativelanguage.googleapis.com";
  static geminiModel = myPreferences.geminiModel.trim() || "gemini-2.0-flash";
}

// Test AES online: https://www.sojson.com/encrypt_aes.html
export function myDecrypt(ciphertext: string) {
  // console.warn("decrypt:", ciphertext);
  const bytes = CryptoJS.AES.decrypt(ciphertext, environment.extensionName);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  // console.warn("originalText: ", originalText);
  return originalText;
}

export function myEncrypt(text: string) {
  // console.warn("encrypt:", text);
  const ciphertext = CryptoJS.AES.encrypt(text, environment.extensionName).toString();
  // console.warn("ciphertext: ", ciphertext);
  return ciphertext;
}
