import { getSelectedText } from "@raycast/api";
import { spawnSync, execSync } from "child_process";

const applescript_getClipboard = `
set clipboardType to (item 1 of (item 1 of (clipboard info)) as string)
if (clipboardType = "«class furl»") then
    set output to (POSIX path of (the clipboard as «class furl»))
else if (clipboardType = "«class utf8»") then
    set output to the clipboard
else
    tell me to error "Unsupported clipboard type: " & clipboardType
end if
`;

export function getClipboardContent(): string {
  const content = spawnSync("osascript", ["-e", applescript_getClipboard], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).stdout.trim();
  return content;
}

export type ArgumentType = "Text" | "URL" | " ";

export enum TextType {
  TEXT = "Text",
  URL = "URL",
  NULL = " ",
}

export interface SearchText {
  type: ArgumentType;
  content: string;
}

const inputText = () =>
  getSelectedText()
    .then((text) => (isNotEmpty(text) ? text : getClipboardContent()))
    .catch(() => getClipboardContent())
    .then((text) => (isNotEmpty(text) ? text : ""))
    .catch(() => "");

function isUrl(url: string): boolean {
  return /^(https?:\/\/(([a-zA-Z0-9]+-?)+[a-zA-Z0-9]+\.)+[a-zA-Z]+)(:\d+)?(\/.*)?(\?.*)?(#.*)?$/.test(url);
}

export async function getInputText(): Promise<SearchText> {
  const text: string = await inputText();
  return setInputText(text);
}

export function setInputText(text: string): SearchText {
  const trimText = text.trim();
  if (isNotEmpty(trimText)) {
    if (isUrl(trimText)) {
      return { type: TextType.URL, content: trimText };
    } else {
      return { type: TextType.TEXT, content: trimText };
    }
  } else {
    return { type: TextType.NULL, content: trimText };
  }
}

interface WordCount {
  iTotal: number; //中文字数
  eTotal: number; //英文字数
  sTotal: number; //中文字、中文全角字符
  nTotal: number; //数字字数
  // //汉字
  // $('#hanzi').text(iTotal);
  // //字数
  // $('#zishu').text(nTotal + iTotal);
  // //标点
  // $('#biaodian').text(sTotal - iTotal);
  // //字母
  // $('#zimu').text(eTotal - nTotal);
  // //数字
  // $('#shuzi').text(nTotal);
  // //字符
  // $("#zifu").text(iTotal * 2 + (sTotal - iTotal) * 2 + eTotal);
}
export function calculateWordCount(text: string): WordCount {
  let iTotal = 0;
  let eTotal = 0;
  let sTotal = 0;
  let nTotal = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    //基本汉字
    if (c.match(/[\u4e00-\u9fa5]/)) {
      iTotal++;
    }
    //基本汉字补充
    else if (c.match(/[\u9FA6-\u9fcb]/)) {
      iTotal++;
    }

    if (c.match(/[^\\x00-\xff]/)) {
      sTotal++;
    } else {
      eTotal++;
    }

    if (c.match(/[0-9]/)) {
      nTotal++;
    }
  }
  return { iTotal, eTotal, sTotal, nTotal };
}
export function wordCount(text: string): number {
  const wordCount = calculateWordCount(text);
  return wordCount.sTotal + wordCount.eTotal;
}

const isNotEmpty = (string: string | null | undefined) => {
  return string != null && String(string).length > 0;
};

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const openInBrowser = async (url: string) => {
  execSync(`open ${url}`);
};

const applescript_activeApplication = (name: string) => `
tell application "${name}" 
    activate 
end tell
`;
export const activeApplication = async (applicationName: string) => {
  spawnSync("osascript", ["-e", applescript_activeApplication(applicationName)]);
};

export const googleSearchOpner = async (text: string) => {
  await openInBrowser(urlBuilder(`https://google.com/search?q=`, text));
};
