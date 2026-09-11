import { useState } from "react"
import { AI } from "@raycast/api"
import { showFailureToast, useCachedState } from "@raycast/utils"

export const useAITranslate = (cacheKey: string, options?: { formatFn?: (text?: string) => string }) => {
  const targetLang = "English"
  const finalCacheKey = `${cacheKey}-${targetLang}`

  const [cachedText, setCachedText] = useCachedState<string | undefined>(finalCacheKey, undefined)
  const [streamedText, setStreamedText] = useState<string | undefined>()
  const [isTranslating, setIsTranslating] = useState(false)

  const translate = async (text: string) => {
    setIsTranslating(true)
    setStreamedText("")
    try {
      const prompt = `Translate the following text into ${targetLang}. If it is already in ${targetLang}, return an empty string. Do not add any additional text or explanations.\n\n${text}`
      const answer = AI.ask(prompt, { creativity: "low" })
      let result = ""
      answer.on("data", (chunk) => {
        result += chunk
        setStreamedText(result)
      })
      await answer
      setCachedText(result)
    } catch (e) {
      showFailureToast(e, { title: "Translation failed" })
    } finally {
      setIsTranslating(false)
      setStreamedText(undefined)
    }
  }

  const translatedText = isTranslating ? streamedText : cachedText

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
