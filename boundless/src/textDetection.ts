import { franc } from "franc-min";

export function detectLanguage(text: string): string {
  // 中英文混杂，直接按中文比例返回
  let zhCount = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/[\u4e00-\u9fa5]/.test(char)) {
      zhCount++;
    }
  }
  if (zhCount / text.length > 0.2) {
    return "zh";
  }

  const langCode = franc(text, { minLength: 1, only: ["eng", "jpn", "cmn", "zho", "kor"] });
  if (langCode === "cmn" || langCode === "zho") {
    return "zh"; // 中文
  } else if (langCode === "jpn") {
    return "ja"; // 日语
  } else if (langCode === "kor") {
    return "ko"; // 韩语
  } else if (langCode === "eng") {
    return "en";
  }
  return langCode;
}
