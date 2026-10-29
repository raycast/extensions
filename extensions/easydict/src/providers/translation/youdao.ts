/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import crypto from "node:crypto";

import { userAgent } from "@/consts";
import type { TranslationContent } from "@/core/content/types";
import { getLanguageOfTwoExceptChinese } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { md5 } from "@/shared/crypto";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logError, logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";
import { invalidResponse } from "./response";

interface TranslateParams {
  keyid: string;
  client: string;
  product: string;
  appVersion: string;
  vendor: string;
  pointParam: string;
  mysticTime: string;
  keyfrom: string;
  sign: string;
  i?: string;
  from?: string;
  to?: string;
  dictResult?: string;
}

interface YoudaoKey {
  secretKey: string;
  aesKey: string;
  aesIv: string;
}

/**
 * Check is valid Youdao web translate language.
 *
 * See: https://fanyi.youdao.com/
 */
function isValidYoudaoWebTranslateLanguage(queryTextInfo: QueryInput): boolean {
  const { fromLanguage, toLanguage } = queryTextInfo;
  const targetLanguage = getLanguageOfTwoExceptChinese([fromLanguage, toLanguage]);
  if (!targetLanguage) {
    return false;
  }

  // * Note: Youdao web translate only support Chinese <--> validLanguages
  const validLanguages = ["en", "ja", "ko", "fr", "de", "ru", "es", "it", "ar", "nl", "th"];
  return validLanguages.includes(targetLanguage);
}

export class YoudaoTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Youdao;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;

    const isValidLanguage = isValidYoudaoWebTranslateLanguage(queryWordInfo);

    const youdaoKey = await getYoudaoKey();

    if (!isValidLanguage) {
      logWarn(this.type, `invalid Youdao web translate language: ${fromLanguage} --> ${toLanguage}`);
      throw new RequestError(
        TranslationType.Youdao,
        `Unsupported language pair: ${fromLanguage} -> ${toLanguage}`,
        "INVALID_LANGUAGE",
      );
    }

    const paragraphs = await webTranslate(word, fromLanguage, toLanguage, youdaoKey, signal);
    return { kind: "translation", query: queryWordInfo, paragraphs };
  }
}

// get Youdao key. Refer: https://github.com/HolynnChen/somejs/blob/5c74682faccaa17d52740e7fe285d13de3c32dba/translate.js#L717
async function getYoudaoKey(): Promise<YoudaoKey> {
  const ts: string = String(new Date().getTime());
  const params: TranslateParams = {
    keyid: "webfanyi-key-getter",
    client: "fanyideskweb",
    product: "webfanyi",
    appVersion: "1.0.0",
    vendor: "web",
    pointParam: "client,mysticTime,product",
    mysticTime: ts,
    keyfrom: "fanyi.web",
    sign: md5(`client=fanyideskweb&mysticTime=${ts}&product=webfanyi&key=asdjnjfenknafdfsdfsd`),
  };

  const response = await timedFetch<unknown>("https://dict.youdao.com/webtranslate/key", {
    params,
    headers: {
      Origin: "https://fanyi.youdao.com",
    },
  });

  if (!isRecord(response) || typeof response.code !== "number" || !Number.isFinite(response.code))
    throw invalidResponse(TranslationType.Youdao);
  if (response.code !== 0) {
    if (typeof response.msg !== "string") throw invalidResponse(TranslationType.Youdao);
    throw new RequestError(
      TranslationType.Youdao,
      `Failed to get Youdao key: code=${response.code}, msg=${response.msg}`,
      "KEY_ERROR",
    );
  }

  const data = response.data;
  if (
    !isRecord(data) ||
    typeof data.secretKey !== "string" ||
    !data.secretKey.trim() ||
    typeof data.aesKey !== "string" ||
    !data.aesKey.trim() ||
    typeof data.aesIv !== "string" ||
    !data.aesIv.trim()
  )
    throw invalidResponse(TranslationType.Youdao);
  return { secretKey: data.secretKey, aesKey: data.aesKey, aesIv: data.aesIv };
}

/// New Youdao web translate function, 2025.1.12
async function webTranslate(
  text: string,
  from: string,
  to: string,
  youdaoKey: YoudaoKey,
  signal?: AbortSignal,
): Promise<string[]> {
  const { secretKey, aesKey, aesIv } = youdaoKey;

  const ts: string = String(new Date().getTime());
  const sign = md5(`client=fanyideskweb&mysticTime=${ts}&product=webfanyi&key=${secretKey}`);
  const params: TranslateParams = {
    keyid: "webfanyi",
    client: "fanyideskweb",
    product: "webfanyi",
    appVersion: "1.0.0",
    vendor: "web",
    pointParam: "client,mysticTime,product",
    mysticTime: ts,
    keyfrom: "fanyi.web",
    sign: sign,
    i: text,
    from: from,
    to: to,
  };

  const response: unknown = await timedFetch("https://dict.youdao.com/webtranslate", {
    method: "POST",
    params,
    headers: {
      Referer: "https://fanyi.youdao.com/",
      UserAgent: userAgent,
      Cookie: "OUTFOX_SEARCH_USER_ID=1796239350@10.110.96.157;",
    },
    responseType: "text",
    signal,
  });

  if (typeof response !== "string") throw invalidResponse(TranslationType.Youdao);
  const decryptedData = decryptAES(response, aesKey, aesIv);
  if (!decryptedData) {
    throw new RequestError(TranslationType.Youdao, "Failed to decrypt response data", "DECRYPT_ERROR");
  }

  const decoded: unknown = JSON.parse(decryptedData);
  if (!isRecord(decoded) || !Array.isArray(decoded.translateResult)) throw invalidResponse(TranslationType.Youdao);
  return decoded.translateResult.map((paragraph: unknown) => {
    if (!Array.isArray(paragraph)) throw invalidResponse(TranslationType.Youdao);
    return paragraph
      .map((cell: unknown) => {
        if (!isRecord(cell) || typeof cell.tgt !== "string") throw invalidResponse(TranslationType.Youdao);
        return cell.tgt;
      })
      .join("");
  });
}

function decryptAES(text: string, key: string, iv: string): string | null {
  if (!text) {
    return null;
  }

  text = text.replace(/-/g, "+").replace(/_/g, "/");

  const a = Buffer.from(md5(key), "hex");
  const r = Buffer.from(md5(iv), "hex");

  try {
    const decipher = crypto.createDecipheriv("aes-128-cbc", a, r);
    const decrypted = decipher.update(text, "base64", "utf8") + decipher.final("utf8");
    return decrypted;
  } catch {
    logError("Youdao Translate", "decryption error");
    return null;
  }
}
