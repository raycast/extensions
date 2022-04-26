import { Form, getPreferenceValues } from "@raycast/api";
import Values = Form.Values;

export const regexPunctuation = /\p{Z}|\p{P}|\p{S}/gu;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    annotation: preferencesMap.get("annotation"),
    case: preferencesMap.get("case"),
    coder: preferencesMap.get("coder"),
    format: preferencesMap.get("format"),
    markdown: preferencesMap.get("markdown"),
    time: preferencesMap.get("time"),
    rememberTag: preferencesMap.get("remember-tag"),
    detail: preferencesMap.get("detail"),
  };
};
export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function calculateCharacter(input: string) {
  let iTotal = 0;
  let sTotal = 0;
  let eTotal = 0;
  let iNum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charAt(i);
    //基本汉字
    if (c.match(/[\u4e00-\u9fa5]/)) {
      iTotal++;
    }
    //基本汉字补充
    else if (c.match(/[\u9FA6-\u9fcb]/)) {
      iTotal++;
    }
  }

  for (let i = 0; i < input.length; i++) {
    const c = input.charAt(i);
    if (c.match(/[^x00-\xff]/)) {
      sTotal++;
    } else {
      eTotal++;
    }
    if (c.match(/[0-9]/)) {
      iNum++;
    }
  }

  return {
    textLength: input.length,
    englishCharacter: eTotal - iNum,
    chineseCharacter: iTotal,
    numberCharacter: iNum,
    punctuationCharacter: sTotal - iTotal,
    characterWithoutSpace: input.replaceAll(/\s|(\n)/g, "").length,
    characterWithoutPunctuation: input.replaceAll(/\p{Z}|\p{P}|\p{S}/gu, "").length,
    line: Array.from(input.matchAll(/\n/g)).length + 1,
  };
}
