import type { GenerateContext } from "automd";
import { defineGenerator } from "automd";

import { languageItemList } from "./src/core/language/consts";
import type { LanguageItem } from "./src/core/language/types";

const getYesNo = (condition: unknown) => {
  if (condition) return "✅";
  return "❌";
};

const codeMap: Record<string, string> = {
  "zh-CN": "zh-Hans",
  "zh-TW": "zh-Hant",
  iw: "he", // Hebrew
  jw: "jv", // Javanese
  "mni-Mtei": "mni", // Meiteilon (Manipuri)
};

const displayNamesCache = new Map<string, Intl.DisplayNames>();

const getDisplayNames = (locale: string) => {
  const key = locale === "zh" ? "zh-CN" : "en-US";
  let dn = displayNamesCache.get(key);
  if (!dn) {
    dn = new Intl.DisplayNames([key], { type: "language" });
    displayNamesCache.set(key, dn);
  }
  return dn;
};

const getLangName = (lang: LanguageItem, locale: string) => {
  const code = lang.googleLangCode;
  if (code === "auto") return locale === "zh" ? "自动识别" : "Auto";

  const normalized = codeMap[code] || code;
  const displayNames = getDisplayNames(locale);
  const name = displayNames.of(normalized);
  if (!name || name === normalized) {
    return locale === "zh" ? lang.langChineseName : lang.langEnglishName;
  }
  if (locale !== "zh") {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
};

const getBaseCode = (code: string) => code.split("-")[0];

const getFilteredLangs = () =>
  languageItemList
    .filter((l) => l.langEnglishName !== "Auto")
    .sort((a, b) => {
      const baseA = getBaseCode(a.googleLangCode);
      const baseB = getBaseCode(b.googleLangCode);
      if (baseA === "zh" && baseB === "zh") return 0;
      if (baseA === "zh") return -1;
      if (baseB === "zh") return 1;
      return 0;
    });

const buildMarkdownTable = (headers: string[], rows: string[][]): string => {
  const lines = [];
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "-").join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${row.join(" | ")} |`);
  }
  return lines.join("\n");
};

const generateEasydictLanguages = ({ args }: GenerateContext) => {
  const locale = args.locale as string;
  const isZh = locale === "zh";
  const langs = getFilteredLangs().map((l) => getLangName(l, locale));
  const count = langs.length;

  if (isZh) {
    return { contents: `目前总计支持 ${count} 种语言：**${langs.join("，")}。**` };
  } else {
    return { contents: `Currently we support ${count} languages: **${langs.join(", ")}.**` };
  }
};

const generateEasydictDetectionTable = ({ args }: GenerateContext) => {
  const locale = args.locale as string;
  const isZh = locale === "zh";

  const headers = isZh
    ? ["语言", "Bing", "百度", "火山", "腾讯"]
    : ["Languages", "Bing", "Baidu", "Volcano", "Tencent"];

  const rows: string[][] = [];

  for (const lang of getFilteredLangs()) {
    const name = getLangName(lang, locale);
    rows.push([
      name,
      getYesNo(lang.bingLangCode),
      getYesNo(lang.baiduLangCode),
      getYesNo(lang.volcanoLangCode),
      getYesNo(lang.tencentDetectCode),
    ]);
  }

  return { contents: buildMarkdownTable(headers, rows) };
};

const generateEasydictTranslationTable = ({ args }: GenerateContext) => {
  const locale = args.locale as string;
  const isZh = locale === "zh";

  const headers = isZh
    ? [
        "语言",
        "有道翻译",
        "DeepL",
        "Google 翻译",
        "Bing 翻译",
        "🍎 系统翻译",
        "百度翻译",
        "火山翻译",
        "腾讯翻译",
        "彩云小译",
      ]
    : ["Languages", "Youdao", "DeepL", "Google", "Bing", "🍎 Apple", "Baidu", "Volcano", "Tencent", "Caiyun"];

  const rows: string[][] = [];

  for (const lang of getFilteredLangs()) {
    const name = getLangName(lang, locale);
    const cols = [
      name,
      getYesNo(lang.youdaoLangCode),
      getYesNo(lang.deepLSourceId),
      getYesNo(lang.googleLangCode),
      getYesNo(lang.bingLangCode),
      getYesNo(lang.appleLangCode),
      getYesNo(lang.baiduLangCode),
      getYesNo(lang.volcanoLangCode),
      getYesNo(lang.tencentLangCode),
      getYesNo(lang.caiyunLangCode),
    ];

    rows.push(cols);
  }

  return { contents: buildMarkdownTable(headers, rows) };
};

/** @type {import("automd").Config} */
export default {
  input: ["README.md", "docs/README_ZH.md"],
  generators: {
    easydictLanguages: defineGenerator({
      name: "easydictLanguages",
      generate: generateEasydictLanguages,
    }),
    easydictDetectionTable: defineGenerator({
      name: "easydictDetectionTable",
      generate: generateEasydictDetectionTable,
    }),
    easydictTranslationTable: defineGenerator({
      name: "easydictTranslationTable",
      generate: generateEasydictTranslationTable,
    }),
  },
};
