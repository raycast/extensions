import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import crypto from "crypto";
import { youdaoTranslateResult, youdaoKey } from "./type";

const youdaoURL = "https://openapi.youdao.com/api";

//有道截取长度 生成戳
function truncate(q: string) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

//打包youdao api请求参数
function createParams(src_text: string, from: string, to: string, domain: string) {
  const prefercences = getPreferenceValues<youdaoKey>();
  const key = prefercences.youdaoTransAPPKey;
  const secret = prefercences.youdaoTransAPPSecret;
  const salt = crypto.randomUUID();
  const curtime = Math.round(new Date().getTime() / 1000);
  const tmp_str = key + truncate(src_text) + salt.toString() + curtime + secret;
  const sign = crypto.createHash("sha256").update(tmp_str).digest("hex");
  const params = new URLSearchParams();
  params.set("q", src_text);
  params.set("from", from);
  params.set("to", to);
  params.set("appKey", key);
  params.set("salt", salt);
  params.set("sign", sign);
  params.set("signType", "v3");
  if (domain === "null") params.set("rejectFallback", "true");
  else params.set("domain", domain);

  params.set("curtime", curtime.toString());
  return params.toString();
}

async function youdaoTranslate(src_text: string): Promise<youdaoTranslateResult> {
  try {
    const params = createParams(src_text, "auto", "auto", "computers");
    const options = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    const response = await fetch(youdaoURL + "?" + params, options);
    const data = (await response.json()) as youdaoTranslateResult;
    console.log(data);
    const errorCode = data.errorCode;
    if (errorCode === "0") {
      return new Promise((resolve) => resolve(data));
    } else {
      throw new Error(
        "youdao API error code:" +
          errorCode +
          ".\r\n More Information can be found at https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html#section-14"
      );
    }
  } catch (error) {
    const e = error instanceof Error ? error : new Error("Unknown error");
    throw new Error(e.message);
  }
}

export { youdaoTranslate };
