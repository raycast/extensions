import { Color, Toast } from "@raycast/api";

import type { RecordObject, Language, DocItem } from "@/type";

export const EN_US = "en-US";

export const ZH_CN = "zh-CN";

export const VERSION_4 = "v4";

export const VERSION_3 = "v3";

export const VERSION_2 = "v2";

export const VANT_WEBSITE = "https://vant.pro/vant";

export const GITHUB_API = "https://api.github.com/repos/youzan/vant/contents";

export const GITHUB_BLOB = "https://github.com/youzan/vant/blob";

export const LANGUAGES: Language[] = [
  {
    label: "English (US)",
    value: EN_US,
  },
  {
    label: "中文 (简体)",
    value: ZH_CN,
  },
];

export const SUPPORT_STATE_TEXT_MAP: RecordObject<RecordObject<string>> = {
  [EN_US]: {
    [VERSION_4]: "Long-term support",
    [VERSION_3]: "End of life",
    [VERSION_2]: "End of life",
  },
  [ZH_CN]: {
    [VERSION_4]: "长期支持",
    [VERSION_3]: "终止支持，不再接受 PR",
    [VERSION_2]: "终止支持，不再接受 PR",
  },
};

export const SUPPORT_STATE_COLOR_MAP: RecordObject<string> = {
  [VERSION_4]: Color.Green,
  [VERSION_3]: Color.Magenta,
  [VERSION_2]: Color.Magenta,
};

export const TOAST_TEXT_MAP: RecordObject<RecordObject<string>> = {
  [EN_US]: {
    [Toast.Style.Animated]: "Loading document data",
    [Toast.Style.Success]: "Document loading successfully",
    [Toast.Style.Failure]: "Document loading failed",
  },
  [ZH_CN]: {
    [Toast.Style.Animated]: "正在加载文档数据",
    [Toast.Style.Success]: "文档加载成功",
    [Toast.Style.Failure]: "文档加载失败",
  },
};

export const getSupportStateText = (language: string, version: string) => SUPPORT_STATE_TEXT_MAP[language][version];

export const getSupportStateColor = (version: string) => SUPPORT_STATE_COLOR_MAP[version];

export const getToastText = (language: string, style: Toast.Style) => TOAST_TEXT_MAP[language][style];

export function getCompDocUrl(language: string, item: DocItem) {
  return `${VANT_WEBSITE}/${item.version}/#/${language}/${item.component}`;
}

export function getCompGithubUrl(language: string, item: DocItem) {
  const { version, filePath } = item;

  const map: RecordObject<string> = {
    v4: "main",
    v3: "3.x",
    v2: "2.x",
  };

  const ref = map[version];

  const url = `${GITHUB_BLOB}/${ref}` + filePath;

  return url;
}
