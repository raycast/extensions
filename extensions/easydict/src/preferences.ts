/*
 * @author: tisfeng
 * @createTime: 2022-08-05 10:36
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-13 11:27
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

  enableAppleLanguageDetect: boolean;
  enableAppleTranslate: boolean;

  enableCaiyunTranslate: boolean;
  caiyunToken: string;

  enableVolcanoTranslate: boolean;
  volcanoAccessKeyId: string;
  volcanoAccessKeySecret: string;
}

/**
 * Service keys.
 *
 * * NOTE: Please apply for your own keys as much as possible. Please do not abuse them, otherwise I have to revoke them 😑。
 */
export class AppKeyStore {
  private static defaultEncryptedBaiduAppId = "U2FsdGVkX1/QHkSw+8qxr99vLkSasBfBRmA6Kb5nMyjP8IJazM9DcOpd3cOY6/il";
  private static defaultEncryptedBaiduAppSecret = "U2FsdGVkX1+a2LbZ0+jntJTQjpPKUNWGrlr4NSBOwmlah7iP+w2gefq1UpCan39J";
  private static defaultBaiduAppId = myDecrypt(this.defaultEncryptedBaiduAppId);
  private static defaultBaiduAppSecret = myDecrypt(this.defaultEncryptedBaiduAppSecret);

  private static defaultEncryptedTencentSecretId =
    "U2FsdGVkX19lHBVXE+CEZI9cENSToLIGzHDsUIE+RyvIC66rgxumDmpYPDY4MdaTSbrq7MIyDvtgXaLvzijYSg==";
  private static defaultEncryptedTencentSecretKey =
    "U2FsdGVkX1+N6wDYXNiUISwKOM97cY03RjXmC+0+iodFo3b4NTNC1J8RR6xqcbdyF7z3Z2yQRMHHxn4m02aUvA==";
  private static defaultTencentSecretId = myDecrypt(this.defaultEncryptedTencentSecretId);
  private static defaultTencentSecretKey = myDecrypt(this.defaultEncryptedTencentSecretKey);

  static defaultEncryptedDeepLAuthKey =
    "U2FsdGVkX190UMu/gorJ/qgwhayFJilCPE5kSfOutkELsUnylfAZEtJGVPin3njGRwC2odphwTigbCzEcJ4kAw==";
  private static defaultDeepLAuthKey = myDecrypt(this.defaultEncryptedDeepLAuthKey);

  private static defaultEncryptedCaiyunToken = "U2FsdGVkX1+ihWvHkAfPMrWHju5Kg4EXAm1AVbXazEeHaXE1jdeUzZZrhjdKmS6u";
  private static defaultCaiyunToken = myDecrypt(this.defaultEncryptedCaiyunToken);

  private static defaultEncryptedVolcanoAccessKeyId =
    "U2FsdGVkX1/hnsLekyaJC6ZRHhl2zF+DY3qIpKakBl+VzCNJmfTf7gWlzBDM/XRv4lREJR6cXNup5/27M3CxcQ==";
  private static defaultEncryptedVolcanoSecrectAccessKey =
    "U2FsdGVkX18WjU7IuyZYfezclJHCuufVQR0tWprs/kFI51/Hm2aPLSrYRVOGdNGtrleSGyaixypEKiku8vYejn9GbQxlHmbwN+Pj34Kxup4=";
  private static defaultVolcanoAccessId = myDecrypt(this.defaultEncryptedVolcanoAccessKeyId);
  private static defaultVolcanoAccessKey = myDecrypt(this.defaultEncryptedVolcanoSecrectAccessKey);

  // youdao app id and appsecret
  static youdaoAppId = myPreferences.youdaoAppId.trim().length > 0 ? myPreferences.youdaoAppId.trim() : undefined;
  static youdaoAppSecret =
    myPreferences.youdaoAppSecret.trim().length > 0 ? myPreferences.youdaoAppSecret.trim() : undefined;

  // baidu app id and secret
  static baiduAppId =
    myPreferences.baiduAppId.trim().length > 0 ? myPreferences.baiduAppId.trim() : this.defaultBaiduAppId;
  static baiduAppSecret =
    myPreferences.baiduAppSecret.trim().length > 0 ? myPreferences.baiduAppSecret.trim() : this.defaultBaiduAppSecret;

  // tencent secret id and key
  static tencentSecretId =
    myPreferences.tencentSecretId.trim().length > 0
      ? myPreferences.tencentSecretId.trim()
      : this.defaultTencentSecretId;
  static tencentSecretKey =
    myPreferences.tencentSecretKey.trim().length > 0
      ? myPreferences.tencentSecretKey.trim()
      : this.defaultTencentSecretKey;

  static userDeepLAuthKey = myPreferences.deepLAuthKey.trim();

  static caiyunToken =
    myPreferences.caiyunToken.trim().length > 0 ? myPreferences.caiyunToken.trim() : this.defaultCaiyunToken;

  static volcanoSecretId =
    myPreferences.volcanoAccessKeyId.trim().length > 0
      ? myPreferences.volcanoAccessKeyId.trim()
      : this.defaultVolcanoAccessId;
  static volcanoSecretKey =
    myPreferences.volcanoAccessKeySecret.trim().length > 0
      ? myPreferences.volcanoAccessKeySecret.trim()
      : this.defaultVolcanoAccessKey;
}

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
