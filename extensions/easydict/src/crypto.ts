/*
 * @author: tisfeng
 * @createTime: 2022-07-15 11:39
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-15 21:59
 * @fileName: crypto.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import CryptoJS from "crypto-js";
import { myPreferences } from "./utils";

// * NOTE: Please apply for your own keys as much as possible. Please do not abuse them, otherwise I have to revoke them 😑。
// Encrypted app id and key.
const defaultEncrytedYoudaoAppId = "U2FsdGVkX19SpBCGxMeYKP0iS1PWKmvPeqIYNaZjAZC142Y5pLrOskw0gqHGpVS1";
const defaultEncrytedYoudaoAppKey =
  "U2FsdGVkX1/JF2ZMngmTw8Vm+P0pHWmHKLQhGpUtYiDc0kLZl6FKw1Vn3hMyl7iL7owwReGJCLsovDxztZKb9g==";
const defaultYoudaoAppId = myDecrypt(defaultEncrytedYoudaoAppId);
const defaultYoudaoAppSecret = myDecrypt(defaultEncrytedYoudaoAppKey);

const defaultEncryptedBaiduAppId = "U2FsdGVkX1/QHkSw+8qxr99vLkSasBfBRmA6Kb5nMyjP8IJazM9DcOpd3cOY6/il";
const defaultEncryptedBaiduAppSecret = "U2FsdGVkX1+a2LbZ0+jntJTQjpPKUNWGrlr4NSBOwmlah7iP+w2gefq1UpCan39J";
const defaultBaiduAppId = myDecrypt(defaultEncryptedBaiduAppId);
const defaultBaiduAppSecret = myDecrypt(defaultEncryptedBaiduAppSecret);

const defaultEncryptedTencentSecretId =
  "U2FsdGVkX19lHBVXE+CEZI9cENSToLIGzHDsUIE+RyvIC66rgxumDmpYPDY4MdaTSbrq7MIyDvtgXaLvzijYSg==";
const defaultEncryptedTencentSecretKey =
  "U2FsdGVkX1+N6wDYXNiUISwKOM97cY03RjXmC+0+iodFo3b4NTNC1J8RR6xqcbdyF7z3Z2yQRMHHxn4m02aUvA==";
const defaultTencentSecretId = myDecrypt(defaultEncryptedTencentSecretId);
const defaultTencentSecretKey = myDecrypt(defaultEncryptedTencentSecretKey);

/**
 * This deepl key is from Github, we do not guarantee that it will work all the time.
 * https://github.com/Exmaralda-Org/exmaralda/blob/c7a62214a6eb432ec25519b4c3ca9817efbe58fa/src/org/exmaralda/webservices/WordCloudConnector.java#L51
 */
const defaultEncryptedDeepLAuthKey =
  "U2FsdGVkX19Vg3zrZOyFiGrojAnw7cr5b96+nbzcJowqSpQX7wS00OkCa3dvpU3sQjCg9d519KOosa9/lsMzSA==";
const defaultDeepLAuthKey = myDecrypt(defaultEncryptedDeepLAuthKey);

const defaultEncryptedCaiyunToken = "U2FsdGVkX1+ihWvHkAfPMrWHju5Kg4EXAm1AVbXazEeHaXE1jdeUzZZrhjdKmS6u";
const defaultCaiyunToken = myDecrypt(defaultEncryptedCaiyunToken);

// youdao app id and appsecret
export const youdaoAppId =
  myPreferences.youdaoAppId.trim().length > 0 ? myPreferences.youdaoAppId.trim() : defaultYoudaoAppId;
export const youdaoAppSecret =
  myPreferences.youdaoAppSecret.trim().length > 0 ? myPreferences.youdaoAppSecret.trim() : defaultYoudaoAppSecret;

// baidu app id and secret
export const baiduAppId =
  myPreferences.baiduAppId.trim().length > 0 ? myPreferences.baiduAppId.trim() : defaultBaiduAppId;
export const baiduAppSecret =
  myPreferences.baiduAppSecret.trim().length > 0 ? myPreferences.baiduAppSecret.trim() : defaultBaiduAppSecret;

// tencent secret id and key
export const tencentSecretId =
  myPreferences.tencentSecretId.trim().length > 0 ? myPreferences.tencentSecretId.trim() : defaultTencentSecretId;
export const tencentSecretKey =
  myPreferences.tencentSecretKey.trim().length > 0 ? myPreferences.tencentSecretKey.trim() : defaultTencentSecretKey;

export const deepLAuthKey =
  myPreferences.deepLAuthKey.trim().length > 0 ? myPreferences.deepLAuthKey.trim() : defaultDeepLAuthKey;

export const caiyunToken =
  myPreferences.caiyunToken.trim().length > 0 ? myPreferences.caiyunToken.trim() : defaultCaiyunToken;

export function myEncrypt(text: string) {
  // console.warn("encrypt:", text);
  const ciphertext = CryptoJS.AES.encrypt(text, environment.extensionName).toString();
  // console.warn("ciphertext: ", ciphertext);
  return ciphertext;
}

export function myDecrypt(ciphertext: string) {
  // console.warn("decrypt:", ciphertext);
  const bytes = CryptoJS.AES.decrypt(ciphertext, environment.extensionName);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  // console.warn("originalText: ", originalText);
  return originalText;
}
