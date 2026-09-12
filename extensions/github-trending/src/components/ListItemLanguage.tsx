import { Action, ActionPanel, List } from '@raycast/api'

interface ListItemLanguageProps {
  lang: string
  onLanguageChange: (lang: string) => void
}
export const ListItemLanguage = ({ lang, onLanguageChange }: ListItemLanguageProps) => (
  <List.Item
    title={lang}
    actions={
      <ActionPanel>
        <Action title="Select Language" onAction={() => onLanguageChange(lang)} />
      </ActionPanel>
    }
  />
)
