export const regexPunctuation = /\p{Z}|\p{P}|\p{S}/gu;

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

export function buildRegexp(content: string) {
  try {
    if (eval(content) instanceof RegExp) {
      const regSource = content.substring(content.indexOf("/") + 1, content.lastIndexOf("/"));
      const regModifier = content.substring(content.lastIndexOf("/") + 1);
      return new RegExp(regSource, regModifier);
    }
  } catch (e) {
    console.error("[buildRegexp] " + String(e));
  }
  return content;
}

export function camelCaseToOtherCase(str: string, linkCharacter: string) {
  let finalStr = str.replaceAll(" ", "");
  try {
    let outString = "";
    finalStr.split("").forEach((value, index) => {
      if (index === 0) {
        outString = outString + value.toLowerCase();
      } else {
        isUpper(value)
          ? (outString = outString + linkCharacter + value.toLowerCase())
          : (outString = outString + value);
      }
    });
    finalStr = outString;
  } catch (e) {
    console.error(String(e));
  }
  return finalStr;
}

function isUpper(char: string) {
  return !/\d/.test(char) && char !== char.toLowerCase();
}
