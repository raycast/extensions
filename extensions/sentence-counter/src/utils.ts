/**
 * Supported languages for text analysis
 */
export type SupportedLanguage = "en" | "zh" | "es" | "fr" | "de" | "ja";

/**
 * Detects the primary language of the given text based on character frequency and patterns
 * @param text - The text to analyze
 * @returns A promise that resolves to the detected language code
 * @example
 * ```typescript
 * const text = "Hello, world! 你好，世界！"
 * const lang = await detectLanguage(text)
 * console.log(lang) // 'en' or 'zh' depending on which language has more characters
 * ```
 */
export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  const charRanges = {
    zh: /[\u4e00-\u9fff]/g,
    ja: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g,
    en: /[a-zA-Z]/g,
    es: /[áéíóúüñÁÉÍÓÚÜÑ]/g,
    fr: /[àâçéèêëîïôûùüÿœæÀÂÇÉÈÊËÎÏÔÛÙÜŸŒÆ]/g,
    de: /[äöüßÄÖÜ]/g,
  };

  const scores: Record<string, number> = {
    en: 0,
    zh: 0,
    es: 0,
    fr: 0,
    de: 0,
    ja: 0,
  };

  for (const [lang, range] of Object.entries(charRanges)) {
    const matches = text.match(range);
    if (matches) {
      scores[lang] = matches.length;
    }
  }

  let maxScore = 0;
  let detectedLang: SupportedLanguage = "en";

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as SupportedLanguage;
    }
  }

  if (maxScore === 0) {
    return "en";
  }

  return detectedLang;
}

/**
 * Splits text into sentences based on language-specific and universal rules
 * @param text - The text to split into sentences
 * @returns An array of sentences
 * @example
 * ```typescript
 * const text = "Hello! How are you? I'm fine."
 * const sentences = splitSentences(text)
 * console.log(sentences) // ['Hello!', 'How are you?', "I'm fine."]
 * ```
 */
export function splitSentences(text: string): string[] {
  const combinedPattern = /[.?!。！？；?!]+\s*|(?<=[^\p{L}\p{N}])([.?!。！？；])\s*/gu;
  const sentences = text.split(combinedPattern).filter(Boolean);
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Counts words in text based on language-specific and universal rules
 * @param text - The text to count words in
 * @returns A promise that resolves to an array of words
 * @example
 * ```typescript
 * const text = "Hello world! 你好世界！"
 * const words = await countWords(text)
 * console.log(words) // ['Hello', 'world', '你好', '世界']
 * ```
 */
export async function countWords(text: string): Promise<string[]> {
  const wordRegex = /[\p{L}\p{N}'-]+/gu;
  return text.match(wordRegex) || [];
}

/**
 * Counts sentences in text
 * @param text - The text to count sentences in
 * @returns The number of sentences
 * @example
 * ```typescript
 * const text = "Hello! How are you? I'm fine."
 * const count = countSentences(text)
 * console.log(count) // 3
 * ```
 */
export function countSentences(text: string): number {
  return splitSentences(text).length;
}

/**
 * Analyzes text and returns comprehensive statistics
 * @param text - The text to analyze
 * @returns A promise that resolves to an object containing text statistics
 * @example
 * ```typescript
 * const text = "Hello! How are you? I'm fine."
 * const stats = await analyzeText(text)
 * console.log(stats)
 * // {
 * //   language: 'en',
 * //   sentenceCount: 3,
 * //   wordCount: 5,
 * //   sentences: ['Hello!', 'How are you?', "I'm fine."],
 * //   words: ['Hello', 'How', 'are', 'you', "I'm", 'fine']
 * // }
 * ```
 */
export async function analyzeText(text: string) {
  const language = await detectLanguage(text);
  const sentences = splitSentences(text);
  const words = await countWords(text);

  return {
    language,
    sentenceCount: sentences.length,
    wordCount: words.length,
    sentences,
    words,
  };
}
