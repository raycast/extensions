import { notion } from '@/utils/icons'
import { Action } from '@raycast/api'

export function OpenInNotionAction({ url }: { url: string }) {
  return (
    <Action.OpenInBrowser
      title="Open in Notion App"
      icon={{ source: notion }}
      url={url}
      shortcut={{ modifiers: ['cmd'], key: 'o' }}
    />
  )
}
