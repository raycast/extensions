import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  language: "en" | "zh";
}

export interface Translations {
  decodedValue: string;
  decodedValueJson: string;
  rawValue: string;
  protocol: string;
  host: string;
  path: string;
  paramCount: string;
  urlInfo: string;
  paramsCount: (n: number) => string;
  noParams: string;
  noParamsDetail: string;
  copyHost: string;
  copyAllParams: string;
  pasteFromClipboard: string;
  copyDecodedValue: string;
  copyRawValue: string;
  copyKeyValue: string;
  clipboardEmpty: string;
  noValidUrl: string;
  parseSuccess: string;
  clipboardReadFailed: string;
  noUrlFound: string;
  noUrlDescription: string;
}

const en: Translations = {
  decodedValue: "**Decoded Value**",
  decodedValueJson: "**Decoded Value** *(JSON)*",
  rawValue: "**Raw Value** *(URL Encoded)*",
  protocol: "Protocol",
  host: "Host",
  path: "Path",
  paramCount: "Param Count",
  urlInfo: "URL Info",
  paramsCount: (n: number) => `${n} params`,
  noParams: "No query parameters",
  noParamsDetail: "This URL has no query parameters.",
  copyHost: "Copy Host",
  copyAllParams: "Copy All Params",
  pasteFromClipboard: "Paste from Clipboard",
  copyDecodedValue: "Copy Decoded Value",
  copyRawValue: "Copy Raw Value",
  copyKeyValue: "Copy as Key=Value",
  clipboardEmpty: "Clipboard is empty",
  noValidUrl: "No valid URL found in clipboard",
  parseSuccess: "Parsed successfully",
  clipboardReadFailed: "Failed to read clipboard",
  noUrlFound: "No URL found in clipboard",
  noUrlDescription: "Copy a URL then press ⌘V to parse",
};

const zh: Translations = {
  decodedValue: "**解码值**",
  decodedValueJson: "**解码值** *(JSON)*",
  rawValue: "**原始值** *(URL 编码)*",
  protocol: "协议",
  host: "域名",
  path: "路径",
  paramCount: "参数数量",
  urlInfo: "URL 信息",
  paramsCount: (n: number) => `${n} 个参数`,
  noParams: "该 URL 没有查询参数",
  noParamsDetail: "该 URL 没有查询参数。",
  copyHost: "复制域名",
  copyAllParams: "复制全部参数",
  pasteFromClipboard: "从剪贴板粘贴",
  copyDecodedValue: "复制解码值",
  copyRawValue: "复制原始值",
  copyKeyValue: "复制为 Key=Value",
  clipboardEmpty: "剪贴板为空",
  noValidUrl: "剪贴板中未找到有效的 URL",
  parseSuccess: "解析成功",
  clipboardReadFailed: "读取剪贴板失败",
  noUrlFound: "剪贴板中未找到 URL",
  noUrlDescription: "复制一个 URL 后按 ⌘V 解析",
};

export function getTranslations(): Translations {
  const { language } = getPreferenceValues<Preferences>();
  return language === "zh" ? zh : en;
}
