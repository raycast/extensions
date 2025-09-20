import axios from "axios";
import CryptoJS from "crypto-js";
import { userAgent } from "../../consts";
import { QueryType, QueryTypeResult, QueryWordInfo, RequestErrorInfo, TranslationType } from "../../types";
import { YoudaoKey } from "./key.type";
import { TranslateParams, YoudaoTranslateResponse } from "./translate.type";
import { isValidYoudaoWebTranslateLanguage } from "./utils";

export async function requestYoudaoWebTranslate(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType,
): Promise<QueryTypeResult> {
  console.log(`---> start requestYoudaoWebTranslate: ${queryWordInfo.word}`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;

  const type = queryType ?? TranslationType.Youdao;
  const isValidLanguage = isValidYoudaoWebTranslateLanguage(queryWordInfo);

  let youdaoKey: YoudaoKey | null = null;
  try {
    youdaoKey = await getYoudaoKey();
  } catch (error) {
    console.error("Failed to get Youdao key:", error);
    return Promise.reject({
      type: type,
      message: error instanceof Error ? error.message : String(error),
      code: "KEY_ERROR",
    } as RequestErrorInfo);
  }

  if (!isValidLanguage) {
    console.warn(`---> invalid Youdao web translate language: ${fromLanguage} --> ${toLanguage}`);
    return Promise.reject({
      type: type,
      message: `Unsupported language pair: ${fromLanguage} -> ${toLanguage}`,
      code: "INVALID_LANGUAGE",
    } as RequestErrorInfo);
  }

  try {
    const translateResponse = await webTranslate(word, fromLanguage, toLanguage, youdaoKey);
    const translations = translateResponse.translateResult.map((e: Array<{ tgt: string }>) =>
      e.map((t) => t.tgt).join(""),
    );
    console.log(`---> youdao web translate: ${translations}`);

    return {
      type: type,
      result: translateResponse,
      translations: translations,
      queryWordInfo: queryWordInfo,
    };
  } catch (error) {
    console.error("Failed to translate:", error);
    return Promise.reject({
      type: type,
      message: error instanceof Error ? error.message : String(error),
      code: "TRANSLATE_ERROR",
    } as RequestErrorInfo);
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
    sign: CryptoJS.MD5(`client=fanyideskweb&mysticTime=${ts}&product=webfanyi&key=asdjnjfenknafdfsdfsd`).toString(),
  };

  try {
    // Send request to get key
    const response = await axios.get<YoudaoKey>("https://dict.youdao.com/webtranslate/key", {
      params,
      headers: {
        Origin: "https://fanyi.youdao.com",
      },
    });

    // Check response status
    if (response.data.code !== 0) {
      return Promise.reject({
        type: TranslationType.Youdao,
        message: `Failed to get Youdao key: code=${response.data.code}, msg=${response.data.msg}`,
        code: "KEY_ERROR",
      } as RequestErrorInfo);
    }

    return response.data;
  } catch (error) {
    return Promise.reject({
      type: TranslationType.Youdao,
      message: `An unknown error occurred while getting Youdao key: ${error}`,
      code: "UNKNOWN_ERROR",
    } as RequestErrorInfo);
  }
}

/// New Youdao web translate function, 2025.1.12
async function webTranslate(
  text: string,
  from: string,
  to: string,
  youdaoKey: YoudaoKey,
): Promise<YoudaoTranslateResponse> {
  const { secretKey, aesKey, aesIv } = youdaoKey.data;

  const ts: string = String(new Date().getTime());
  const sign = CryptoJS.MD5(`client=fanyideskweb&mysticTime=${ts}&product=webfanyi&key=${secretKey}`).toString();
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

  try {
    const response = await axios.post("https://dict.youdao.com/webtranslate", null, {
      params,
      headers: {
        Referer: "https://fanyi.youdao.com/",
        UserAgent: userAgent,
        Cookie: "OUTFOX_SEARCH_USER_ID=1796239350@10.110.96.157;",
      },
    });

    const decryptedData = decryptAES(response.data, aesKey, aesIv);
    if (!decryptedData) {
      return Promise.reject({
        type: TranslationType.Youdao,
        message: "Failed to decrypt response data",
        code: "DECRYPT_ERROR",
      } as RequestErrorInfo);
    }

    return JSON.parse(decryptedData);
  } catch (error) {
    return Promise.reject({
      type: TranslationType.Youdao,
      message: `An unknown error occurred while translating: ${error}`,
      code: "UNKNOWN_ERROR",
    } as RequestErrorInfo);
  }
}

function m(e: string): string {
  return CryptoJS.MD5(e).toString(CryptoJS.enc.Hex);
}

function decryptAES(text: string, key: string, iv: string): string | null {
  // console.log("---> Start decrypting...");
  // console.log("---> Input data:", text);

  if (!text) {
    return null;
  }

  text = text.replace(/-/g, "+").replace(/_/g, "/");
  // console.log("---> After replace:", text);

  const a = CryptoJS.enc.Hex.parse(m(key));
  const r = CryptoJS.enc.Hex.parse(m(iv));

  try {
    const i = CryptoJS.AES.decrypt(text, a, {
      iv: r,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const result = i.toString(CryptoJS.enc.Utf8);
    // console.log("---> Decryption result:", result);
    return result;
  } catch (error) {
    console.error("---> Decryption error:", error);
    return null;
  }
}
