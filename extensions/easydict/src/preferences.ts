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

  youdaoAppId: string;
  youdaoAppSecret: string;

  enableDeepLTranslate: boolean;
  deepLAuthKey: string;

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
}

/**
 * Service keys.
 *
 * * NOTE: Please apply for your own keys as much as possible. Please do not abuse them, otherwise I have to revoke them 😑。
 */
export class AppKeyStore {
  static defaultEncryptedDeepLAuthKey =
    "U2FsdGVkX190UMu/gorJ/qgwhayFJilCPE5kSfOutkELsUnylfAZEtJGVPin3njGRwC2odphwTigbCzEcJ4kAw==";
  private static defaultDeepLAuthKey = myDecrypt(this.defaultEncryptedDeepLAuthKey);

  // This is a official test token from https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
  private static defaultEncryptedCaiyunToken = "U2FsdGVkX1+RTgfMmgZgkD1Phn4FyvzMiMed5BvxnjoqS8QIJ/AFjUJdfC7OqjU3";
  private static defaultCaiyunToken = myDecrypt(this.defaultEncryptedCaiyunToken);

  // youdao app id and appsecret
  static youdaoAppId = myPreferences.youdaoAppId.trim();
  static youdaoAppSecret = myPreferences.youdaoAppSecret.trim();

  // baidu app id and secret
  static baiduAppId = myPreferences.baiduAppId.trim();
  static baiduAppSecret = myPreferences.baiduAppSecret.trim();

  // tencent secret id and key
  static tencentSecretId = myPreferences.tencentSecretId.trim();
  static tencentSecretKey = myPreferences.tencentSecretKey.trim();

  static userDeepLAuthKey = myPreferences.deepLAuthKey.trim();

  static caiyunToken = myPreferences.caiyunToken.trim() || this.defaultCaiyunToken;

  static volcanoSecretId = myPreferences.volcanoAccessKeyId.trim();
  static volcanoSecretKey = myPreferences.volcanoAccessKeySecret.trim();

  private static defaultOpenAIAPIURL = "https://api.openai.com/v1/chat/completions";
  static openAIAPIKey = myPreferences.openAIAPIKey.trim();
  static openAIAPIURL = myPreferences.openAIAPIURL.trim() || this.defaultOpenAIAPIURL;
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
