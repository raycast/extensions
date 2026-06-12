import { useState } from "react"
import { AI, Cache, getPreferenceValues } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"

const cache = new Cache()

export const useAITranslate = (cacheKey: string, options?: { formatFn?: (text?: string) => string }) => {
  const [translatedText, setTranslatedText] = useState<string | undefined>(cache.get(cacheKey))
  const [isTranslating, setIsTranslating] = useState(false)

  const translate = async (text: string) => {
    setIsTranslating(true)
    try {
      const preferences = getPreferenceValues<Preferences>()
      const targetLang = preferences.aiTranslationLanguage
      const prompt = `Translate the following text into ${targetLang}. If it is already in ${targetLang}, return an empty string. Do not add any additional text or explanations.\n\n${text}`
      const answer = AI.ask(prompt, { creativity: "low" })
      let result = ""
      answer.on("data", (chunk) => {
        result += chunk
        setTranslatedText(result)
      })
      await answer
      cache.set(cacheKey, result)
    } catch (e) {
      showFailureToast(e, { title: "Translation failed" })
    } finally {
      setIsTranslating(false)
    }
  }

  let translationMarkdown = ""
  if (isTranslating || (translatedText !== undefined && translatedText !== "")) {
    const formattedContent = translatedText
      ? options?.formatFn
        ? options.formatFn(translatedText)
        : translatedText
      : "<p>Translating...</p>"
    translationMarkdown = `\n\n**[AI Translation]**\n${formattedContent}`
  }

  return { translatedText, isTranslating, translate, translationMarkdown }
}
