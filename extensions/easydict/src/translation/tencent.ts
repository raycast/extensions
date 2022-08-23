/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-18 10:21
 * @fileName: tencent.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios from "axios";
import crypto, { BinaryToTextEncoding } from "crypto";
import * as tencentcloud from "tencentcloud-sdk-nodejs-tmt";
import { requestCostTime } from "../axiosConfig";
import { LanguageDetectType, LanguageDetectTypeResult } from "../detectLanauge/types";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getTencentLanguageId, getYoudaoLanguageIdFromTencentId } from "../language/languages";
import { KeyStore } from "../preferences";
import { QueryTypeResult, RequestErrorInfo, TencentTranslateResult, TranslationType } from "../types";

const TmtClient = tencentcloud.tmt.v20180321.Client;

const SECRET_ID = KeyStore.tencentSecretId;
const SECRET_KEY = KeyStore.tencentSecretKey;

const endpoint = "tmt.tencentcloudapi.com";
const region = "ap-guangzhou";
const projectId = 0;

const clientConfig = {
  credential: {
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  },
  region: region,
  profile: {
    httpProfile: {
      endpoint: endpoint,
    },
  },
};
const client = new TmtClient(clientConfig);

/**
 * Tencent translate, use axios, sign manually. Cost time: ~0.1 ms
 *
 * Docs: https://cloud.tencent.com/document/api/551/15619
 * Ref: https://github.com/raycast/extensions/blob/8ec3e04197695a78691e508f33db2044dce3e16f/extensions/itranslate/src/itranslate.shared.tsx#L426
 */
export function requestTencentTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Tencent translate`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const from = getTencentLanguageId(fromLanguage);
  const to = getTencentLanguageId(toLanguage);
  if (!from || !to) {
    console.warn(`Tencent translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: TranslationType.Tencent,
      result: undefined,
      translations: [],
      wordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  function sha256(message: string, secret = "", encoding?: BinaryToTextEncoding) {
    const hmac = crypto.createHmac("sha256", secret);
    return hmac.update(message).digest(encoding as BinaryToTextEncoding);
  }

  function getHash(message: string) {
    const hash = crypto.createHash("sha256");
    return hash.update(message).digest("hex");
  }

  function getDate(timestamp: number) {
    const date = new Date(timestamp * 1000);
    const year = date.getUTCFullYear();
    const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
    const day = ("0" + date.getUTCDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  const action = "TextTranslate";
  const version = "2018-03-21";
  const algorithm = "TC3-HMAC-SHA256";
  const signedHeaders = "content-type;host";
  const service = "tmt";

  const timestamp = Math.trunc(new Date().getTime() / 1000);
  const date = getDate(timestamp);

  const payload = {
    SourceText: word,
    Source: from,
    Target: to,
    ProjectId: 0,
  };

  const hashedRequestPayload = getHash(JSON.stringify(payload));
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = "content-type:application/json; charset=utf-8\n" + "host:" + endpoint + "\n";

  const canonicalRequest =
    httpRequestMethod +
    "\n" +
    canonicalUri +
    "\n" +
    canonicalQueryString +
    "\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    hashedRequestPayload;

  const hashedCanonicalRequest = getHash(canonicalRequest);
  const credentialScope = date + "/" + service + "/" + "tc3_request";
  const stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;

  const kDate = sha256(date, "TC3" + SECRET_KEY);
  const kService = sha256(service, kDate);
  const kSigning = sha256("tc3_request", kService);
  const signature = sha256(stringToSign, kSigning, "hex");

  const authorization =
    algorithm +
    " " +
    "Credential=" +
    SECRET_ID +
    "/" +
    credentialScope +
    ", " +
    "SignedHeaders=" +
    signedHeaders +
    ", " +
    "Signature=" +
    signature;

  const type = TranslationType.Tencent;

  return new Promise((resolve, reject) => {
    axios
      .post(`https://${endpoint}`, payload, {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json; charset=utf-8",
          Host: endpoint,
          "X-TC-Action": action,
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Version": version,
          "X-TC-Region": region,
        },
      })
      .then((response) => {
        const tencentResult = response.data.Response as TencentTranslateResult;
        const translations = tencentResult.TargetText.split("\n");
        console.warn(`---> Tencent translate: ${translations}, cost: ${response.headers[requestCostTime]}`);
        const typeResult: QueryTypeResult = {
          type: type,
          result: tencentResult,
          translations: tencentResult.TargetText.split("\n"),
          wordInfo: queryWordInfo,
        };
        resolve(typeResult);
      })
      .catch((err) => {
        if (err.message === "canceled") {
          console.log(`---> Tencent canceled`);
          return;
        }

        // console.error(`tencent translate error: ${JSON.stringify(err, null, 2)}`);
        const error = err as { code: string; message: string };
        console.error(`Tencent translate error, code: ${error.code}, message: ${error.message}`);
        const errorInfo: RequestErrorInfo = {
          type: type,
          code: error.code,
          message: error.message,
        };
        reject(errorInfo);
      });
  });
}

/**
 * Tencent text translate, use Tencent nodejs sdk.
 *
 * 腾讯文本翻译，5次/秒： https://cloud.tencent.com/document/api/551/15619
 */
export async function requestTencentSDKTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Tencent translate`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const from = getTencentLanguageId(fromLanguage);
  const to = getTencentLanguageId(toLanguage);
  const type = TranslationType.Tencent;

  if (!from || !to) {
    console.warn(`Tencent translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: type,
      result: undefined,
      translations: [],
      wordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }
  const params = {
    SourceText: word,
    Source: from,
    Target: to,
    ProjectId: projectId,
  };
  const startTime = new Date().getTime();

  try {
    const tencentResult = (await client.TextTranslate(params)) as TencentTranslateResult;
    const endTime = new Date().getTime();
    console.log(`Tencen translate: ${tencentResult.TargetText}, cost: ${endTime - startTime} ms`);
    const typeResult: QueryTypeResult = {
      type: type,
      result: tencentResult as TencentTranslateResult,
      translations: tencentResult.TargetText.split("\n"),
      wordInfo: queryWordInfo,
    };
    return Promise.resolve(typeResult);
  } catch (err) {
    // console.error(`tencent translate error: ${JSON.stringify(err, null, 2)}`);
    const error = err as { code: string; message: string };
    console.error(`Tencent translate error, code: ${error.code}, message: ${error.message}`);
    const errorInfo: RequestErrorInfo = {
      type: type,
      code: error.code,
      message: error.message,
    };
    return Promise.reject(errorInfo);
  }
}

/**
 * Tecent language detect, use Tencent nodejs sdk. Cost time: ~0.2s
 *
 * 腾讯语种识别，5次/秒： https://cloud.tencent.com/document/product/551/15620?cps_key=1d358d18a7a17b4a6df8d67a62fd3d3d
 *
 * Todo: use axios to rewrite.
 */
export async function tencentLanguageDetect(text: string): Promise<LanguageDetectTypeResult> {
  const params = {
    Text: text,
    ProjectId: projectId,
  };
  const startTime = new Date().getTime();
  const type = LanguageDetectType.Tencent;

  try {
    const response = await client.LanguageDetect(params);
    const endTime = new Date().getTime();
    const tencentLanguageId = response.Lang || "";
    const youdaoLanguageId = getYoudaoLanguageIdFromTencentId(tencentLanguageId);
    console.warn(
      `tencent detect language id: ${tencentLanguageId}, youdaoId: ${youdaoLanguageId}, cost time: ${
        endTime - startTime
      } ms`
    );
    const typeResult: LanguageDetectTypeResult = {
      type: type,
      sourceLanguageId: tencentLanguageId,
      youdaoLanguageId: youdaoLanguageId,
      confirmed: false,
    };
    return Promise.resolve(typeResult);
  } catch (err) {
    const error = err as { code: string; message: string };
    console.error(`tencent detect error, code: ${error.code}, message: ${error.message}`);
    const errorInfo: RequestErrorInfo = {
      type: type,
      code: error.code,
      message: error.message,
    };
    return Promise.reject(errorInfo);
  }
}
