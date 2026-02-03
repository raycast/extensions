// src/languageUtils.ts
// 语言代码映射和智能匹配工具

/**
 * 语言代码映射
 * 将标准语言代码映射到不同服务的特定代码
 */
export interface LanguageCodeMap {
  standard: string; // 标准代码（如 "zh"）
  name: string; // 语言名称
  variants: string[]; // 可能的变体（如 ["zh", "zh-CN", "zh-Hans", "zh-CHS"]）
}

/**
 * 常见语言的代码映射表
 */
export const LANGUAGE_CODE_MAPS: LanguageCodeMap[] = [
  {
    standard: "zh",
    name: "Chinese",
    variants: ["zh", "zh-CN", "zh-Hans", "zh-CHS", "zh-ZH", "chinese"],
  },
  {
    standard: "en",
    name: "English",
    variants: ["en", "en-US", "en-GB", "english"],
  },
  {
    standard: "ja",
    name: "Japanese",
    variants: ["ja", "jp", "ja-JP", "japanese"],
  },
  {
    standard: "ko",
    name: "Korean",
    variants: ["ko", "kor", "ko-KR", "korean"],
  },
  {
    standard: "es",
    name: "Spanish",
    variants: ["es", "spa", "es-ES", "spanish"],
  },
  {
    standard: "fr",
    name: "French",
    variants: ["fr", "fra", "fr-FR", "french", "fr-CA"],
  },
  {
    standard: "de",
    name: "German",
    variants: ["de", "deu", "de-DE", "german"],
  },
  {
    standard: "ru",
    name: "Russian",
    variants: ["ru", "rus", "ru-RU", "russian"],
  },
  {
    standard: "ar",
    name: "Arabic",
    variants: ["ar", "ara", "ar-SA", "arabic"],
  },
  {
    standard: "pt",
    name: "Portuguese",
    variants: ["pt", "por", "pt-PT", "pt-BR", "portuguese"],
  },
  {
    standard: "it",
    name: "Italian",
    variants: ["it", "ita", "it-IT", "italian"],
  },
];

/**
 * 根据标准语言代码，在可用语言列表中查找匹配的语言代码
 * @param standardCode 标准语言代码（如 "zh"）
 * @param availableLanguages 可用的语言列表
 * @returns 匹配的语言代码，如果没找到则返回 null
 */
export function findMatchingLanguageCode(
  standardCode: string,
  availableLanguages: Array<{ code: string; name: string }>,
): string | null {
  // 1. 首先尝试精确匹配
  const exactMatch = availableLanguages.find((lang) => lang.code === standardCode);
  if (exactMatch) {
    return exactMatch.code;
  }

  // 2. 查找对应的语言映射
  const languageMap = LANGUAGE_CODE_MAPS.find(
    (map) => map.standard === standardCode || map.variants.includes(standardCode.toLowerCase()),
  );

  if (!languageMap) {
    return null;
  }

  // 3. 在可用语言中查找任何变体
  for (const variant of languageMap.variants) {
    const match = availableLanguages.find((lang) => lang.code.toLowerCase() === variant.toLowerCase());
    if (match) {
      return match.code;
    }
  }

  // 4. 尝试模糊匹配（前缀匹配）
  const prefixMatch = availableLanguages.find((lang) =>
    lang.code.toLowerCase().startsWith(languageMap.standard.toLowerCase()),
  );
  if (prefixMatch) {
    return prefixMatch.code;
  }

  return null;
}

/**
 * 获取默认目标语言代码
 * @param defaultStandardCode 默认的标准语言代码（从配置中获取，如 "zh"）
 * @param availableLanguages 可用的语言列表
 * @param fallbackCode 兜底代码（默认 "zh"）
 * @returns 实际可用的语言代码
 */
export function getDefaultTargetLanguageCode(
  defaultStandardCode: string,
  availableLanguages: Array<{ code: string; name: string }>,
  fallbackCode: string = "zh",
): string {
  // 1. 尝试匹配默认语言
  const matchedCode = findMatchingLanguageCode(defaultStandardCode, availableLanguages);
  if (matchedCode) {
    return matchedCode;
  }
  //   console.log("No available language found, using fallback code:", fallbackCode);
  // 2. 尝试匹配兜底语言
  const fallbackMatchedCode = findMatchingLanguageCode(fallbackCode, availableLanguages);
  if (fallbackMatchedCode) {
    return fallbackMatchedCode;
  }
  //   console.log("No available language found, using fallback code:", fallbackCode);
  // 3. 返回第一个非 auto 的可用语言
  const firstAvailable = availableLanguages.find((lang) => lang.code !== "auto");
  if (firstAvailable) {
    return firstAvailable.code;
  }
  //   console.log("No available language found, using fallback code:", fallbackCode);
  // 4. 实在没有，返回兜底代码
  return fallbackCode;
}

/**
 * 标准化语言代码
 * 将各种变体转换为标准代码
 * @param code 任意语言代码
 * @returns 标准语言代码
 */
export function normalizeLanguageCode(code: string): string {
  const languageMap = LANGUAGE_CODE_MAPS.find((map) => map.variants.includes(code));
  //   console.log("normalizeLanguageCode", code, languageMap);
  return languageMap ? languageMap.standard : code;
}

/**
 * 验证语言代码是否在可用列表中
 * @param code 要验证的语言代码
 * @param availableLanguages 可用语言列表
 * @returns 是否存在
 */
export function isLanguageCodeAvailable(
  code: string,
  availableLanguages: Array<{ code: string; name: string }>,
): boolean {
  // console.log("isLanguageCodeAvailable", code, availableLanguages);
  return availableLanguages.some((lang) => lang.code === code);
}
