export function detectLanguageDirection(input: string) {
  const text = input.trim();
  if (!text) {
    return { status: "idle" as const };
  }

  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishCount = (text.match(/[A-Za-z]/g) ?? []).length;

  if (chineseCount >= englishCount) {
    return {
      status: "ready" as const,
      sourceLanguage: "zh" as const,
      targetLanguage: "en" as const,
      directionLabel: "中文 -> English",
    };
  }

  return {
    status: "ready" as const,
    sourceLanguage: "en" as const,
    targetLanguage: "zh" as const,
    directionLabel: "English -> 中文",
  };
}
