import { getPreferenceValues } from "@raycast/api";
import { URLSearchParams } from "url";
import fetch from "node-fetch";
import crypto from "crypto";
interface Prefercences {
  youdaoTransAPPKey: string;
  youdaoTransAPPSecret: string;
}
interface TranslationResponse {
  errorCode?: string; 
  translation?: string[]; 
  basic?: {
    phonetic?: string; 
    // Add other properties if necessary
  };
  // Add other properties if necessary
}
const youdaoURL = "https://openapi.youdao.com/api";

function truncate(q: string) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

function createParams(src_text: string) {
  const prefercences = getPreferenceValues<Prefercences>();
  const key = prefercences.youdaoTransAPPKey;
  const secret = prefercences.youdaoTransAPPSecret;
  const salt = crypto.randomUUID();
  const curtime = Math.round(new Date().getTime() / 1000);
  const tmp_str = key + truncate(src_text) + salt.toString() + curtime + secret;
  const sign = crypto.createHash("sha256").update(tmp_str).digest("hex");

  const params = new URLSearchParams();
  params.set("q", src_text);
  params.set("from", "auto");
  params.set("to", "auto");
  // params.set("domain", "computers");
  params.set("rejectFallback", "true");
  params.set("appKey", key);
  params.set("salt", salt);
  params.set("sign", sign);
  params.set("signType", "v3");
  params.set("curtime", curtime.toString());
  return params.toString();
}

async function youdaoTrans(src_text: string): Promise<string[]> {
  try {
    //构造请求参数
    const params = createParams(src_text);
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    //发起请求
    const response = await fetch(youdaoURL + "?" + params, options);
    const data = await response.json() as TranslationResponse;
    console.log(data);
    //解析和提取翻译结果
    const error_code = data?.errorCode;
    if (error_code == "0") {
      const translated_text = data?.translation?.[0] ?? "";
      const phonetic = data?.basic?.phonetic ?? "";
      console.log(phonetic);
      return new Promise((resolve, reject) => {
        resolve([src_text, translated_text, phonetic]);
      });
    } else {
      throw new Error(`API error: ${error_code}`);
    }
  } catch (error) {
    console.log(error);
    return new Promise((resolve, reject) => {
      reject(error);
    });
  }
}

export { youdaoTrans };
