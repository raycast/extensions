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
import crypto from "node:crypto";
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
  forceMaxCompletionTokens: boolean;

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
  private static defaultEncryptedCaiyunToken = "2/6GZx97PFiA2wMgeMkzlCNmanp2SKdCR9PeD4fFYDgARu0JUEWuDmf4BS+pLEqo";
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
  static forceMaxCompletionTokens = myPreferences.forceMaxCompletionTokens;

  static geminiAPIKey = myPreferences.geminiAPIKey.trim();
  static geminiEndpoint = myPreferences.geminiAPIURL.trim() || "https://generativelanguage.googleapis.com";
  static geminiModel = myPreferences.geminiModel.trim() || "gemini-2.0-flash";
}

function deriveKey(password: string) {
  return crypto.createHash("sha256").update(password).digest(); // 32 bytes
}

export function myEncrypt(text: string) {
  const key = deriveKey(environment.extensionName);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

export function myDecrypt(ciphertext: string) {
  const raw = Buffer.from(ciphertext, "base64");

  const iv = raw.subarray(0, 16);
  const encrypted = raw.subarray(16);

  const key = deriveKey(environment.extensionName);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
