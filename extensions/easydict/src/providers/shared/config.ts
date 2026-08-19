/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { myDecrypt } from "@/utils/crypto";

/**
 * Service keys.
 *
 * * NOTE: Please apply for your own keys as much as possible. Please do not abuse them, otherwise I have to revoke them 😑。
 */
export class ProviderConfig {
  static deepLAuthKey = myPreferences.deepLAuthKey?.trim();
  static deepLEndpoint = myPreferences.deepLEndpoint?.trim();

  // This is a official test token from https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
  private static defaultEncryptedCaiyunToken = "2/6GZx97PFiA2wMgeMkzlCNmanp2SKdCR9PeD4fFYDgARu0JUEWuDmf4BS+pLEqo";
  private static defaultCaiyunToken = myDecrypt(this.defaultEncryptedCaiyunToken);
  static caiyunToken = myPreferences.caiyunToken?.trim() || this.defaultCaiyunToken;

  // baidu app id and secret
  static baiduAppId = myPreferences.baiduAppId?.trim();
  static baiduAppSecret = myPreferences.baiduAppSecret?.trim();

  // tencent secret id and key
  static tencentSecretId = myPreferences.tencentSecretId?.trim();
  static tencentSecretKey = myPreferences.tencentSecretKey?.trim();

  static volcanoSecretId = myPreferences.volcanoAccessKeyId?.trim();
  static volcanoSecretKey = myPreferences.volcanoAccessKeySecret?.trim();

  static openAIAPIKey = myPreferences.openAIAPIKey?.trim();
  static openAIEndpoint = myPreferences.openAIAPIURL.trim();
  static openAIModel = myPreferences.openAIModel.trim();
  static forceMaxCompletionTokens = myPreferences.forceMaxCompletionTokens;

  static geminiAPIKey = myPreferences.geminiAPIKey?.trim();
  static geminiEndpoint = myPreferences.geminiAPIURL.trim();
  static geminiModel = myPreferences.geminiModel.trim();
}

export function hasBaiduAppKey(): boolean {
  return !!(ProviderConfig.baiduAppId && ProviderConfig.baiduAppSecret);
}

export function hasTencentAppKey(): boolean {
  return !!(ProviderConfig.tencentSecretId && ProviderConfig.tencentSecretKey);
}

export function hasVolcanoAppKey(): boolean {
  return !!(ProviderConfig.volcanoSecretId && ProviderConfig.volcanoSecretKey);
}
