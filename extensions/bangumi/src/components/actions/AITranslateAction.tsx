import { Action, Icon, environment, AI } from "@raycast/api"

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
      title={isTranslating ? "Translating…" : "AI Translate"}
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      onAction={() => {
        if (!isTranslating) onTranslate(text)
      }}
    />
  )
}
