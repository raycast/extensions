import type { GenerateContext } from "automd";
import { defineGenerator } from "automd";

import { languageCatalog } from "./src/core/language/catalog";
import { languageItemList } from "./src/core/language/consts";
import type {
  LanguageDefinition,
  LanguageItem,
  ProviderLanguageCodes,
  SourceLanguage,
} from "./src/core/language/types";

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

const catalog: Record<SourceLanguage, LanguageDefinition> = languageCatalog;

/** Provider codes live in the language catalog; language items only carry names. */
const codesOf = (lang: LanguageItem) => catalog[lang.youdaoLangCode].codes;

const getLangName = (lang: LanguageItem, locale: string) => {
  const code = codesOf(lang).googleLangCode;
  if (code === "auto") return locale === "zh" ? "自动识别" : "Auto";

  const normalized = code ? (codeMap[code] ?? code) : undefined;
  const displayNames = getDisplayNames(locale);
  const name = normalized ? displayNames.of(normalized) : undefined;
  if (!name || name === normalized) {
    return locale === "zh" ? lang.langChineseName : lang.langEnglishName;
  }
  if (locale !== "zh") {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
};

const getBaseCode = (code?: string) => (code ?? "").split("-")[0];

const getFilteredLangs = () =>
  languageItemList
    .filter((l) => l.langEnglishName !== "Auto")
    .sort((a, b) => {
      const baseA = getBaseCode(codesOf(a).googleLangCode);
      const baseB = getBaseCode(codesOf(b).googleLangCode);
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

interface ProviderColumn {
  en: string;
  zh: string;
  code: keyof ProviderLanguageCodes | "youdaoLangCode";
}

const detectionColumns: ProviderColumn[] = [
  { en: "Bing", zh: "Bing", code: "bingLangCode" },
  { en: "Baidu", zh: "百度", code: "baiduLangCode" },
  { en: "Volcano", zh: "火山", code: "volcanoLangCode" },
];

const translationColumns: ProviderColumn[] = [
  { en: "Youdao", zh: "有道翻译", code: "youdaoLangCode" },
  { en: "DeepL", zh: "DeepL", code: "deepLSourceId" },
  { en: "Google", zh: "Google 翻译", code: "googleLangCode" },
  { en: "Bing", zh: "Bing 翻译", code: "bingLangCode" },
  { en: "🍎 Apple", zh: "🍎 系统翻译", code: "appleLangCode" },
  { en: "Baidu", zh: "百度翻译", code: "baiduLangCode" },
  { en: "Volcano", zh: "火山翻译", code: "volcanoLangCode" },
  { en: "Caiyun", zh: "彩云小译", code: "caiyunLangCode" },
];

function generateProviderTable({ args }: GenerateContext, columns: ProviderColumn[]) {
  const locale = args.locale === "zh" ? "zh" : "en";
  const headers = [locale === "zh" ? "语言" : "Languages", ...columns.map((column) => column[locale])];
  const rows = getFilteredLangs().map((lang) => {
    const codes = { ...codesOf(lang), youdaoLangCode: lang.youdaoLangCode };
    return [getLangName(lang, locale), ...columns.map(({ code }) => getYesNo(codes[code]))];
  });

  return { contents: buildMarkdownTable(headers, rows) };
}

/** @type {import("automd").Config} */
export default {
  input: ["README.md", "README_ZH.md"],
  generators: {
    easydictLanguages: defineGenerator({
      name: "easydictLanguages",
      generate: generateEasydictLanguages,
    }),
    easydictDetectionTable: defineGenerator({
      name: "easydictDetectionTable",
      generate: (context) => generateProviderTable(context, detectionColumns),
    }),
    easydictTranslationTable: defineGenerator({
      name: "easydictTranslationTable",
      generate: (context) => generateProviderTable(context, translationColumns),
    }),
  },
};
