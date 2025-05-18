import { getPreferenceValues } from "@raycast/api";
import crypto from "crypto";
import { translateResult } from "../../types";

function generateSign(content: string, salt: number, app_key: string, app_secret: string) {
  const md5 = crypto.createHash("md5");
  md5.update(app_key + content + salt + app_secret);
  const cipher = md5.digest("hex");
  return cipher.slice(0, 32).toUpperCase();
}

function handleContent(content: string, handle_annotation: boolean) {
  const annotations = ["///", "//!", "/*", "*/", "//"];
  if (handle_annotation) {
    for (const annotation of annotations) {
      while (content.includes(annotation)) {
        content = content.replace(annotation, "");
      }
    }
  }

  while (content.includes("\r")) {
    content = content.replace("\r", "");
  }

  const contentList = content.split("\n");
  for (const i in contentList) {
    contentList[i] = contentList[i].trim();
    if (contentList[i] == "") {
      contentList[i] = "\n\n";
    }
  }
  content = contentList.join(" ");
  return content;
}

export function translateAPI(content: string, from_language: string, to_language: string) {
  const { app_key, app_secret, handle_annotation } = getPreferenceValues();
  const q = Buffer.from(handleContent(content, handle_annotation)).toString();
  const salt = Date.now();
  const sign = generateSign(q, salt, app_key, app_secret);
  const url = new URL("https://openapi.youdao.com/api");
  const params = new URLSearchParams();
  params.append("q", q);
  params.append("appKey", app_key);
  params.append("from", from_language);
  params.append("to", to_language);
  params.append("salt", String(salt));
  params.append("sign", sign);
  url.search = params.toString();
  return fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json()) as Promise<translateResult>;
}
