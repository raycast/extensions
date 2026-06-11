import { useState } from "react"
import { Action, Icon, environment, AI, Cache, getPreferenceValues } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"

const cache = new Cache()

export const useAITranslate = (cacheKey: string) => {
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

  return { translatedText, isTranslating, translate }
}

export const getTranslationMarkdown = (
  isTranslating: boolean,
  translatedText?: string,
  formatFn?: (text?: string) => string
) => {
  if (isTranslating || (translatedText !== undefined && translatedText !== "")) {
    const formattedContent = translatedText
      ? formatFn
        ? formatFn(translatedText)
        : translatedText
      : "<p>Translating...</p>"
    return `<br/><br/><b>[AI Translation]</b><br/>${formattedContent}`
  }
  return ""
}

export const AITranslateAction = ({
  text,
  onTranslate,
  isTranslating,
}: {
  text?: string
  onTranslate: (text: string) => void
  isTranslating?: boolean
}) => {
  if (!text || !environment.canAccess(AI)) return null

  return (
    <Action
      title={isTranslating ? "Translating…" : "AI Translate Summary"}
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      onAction={() => {
        if (!isTranslating) onTranslate(text)
      }}
    />
  )
}
