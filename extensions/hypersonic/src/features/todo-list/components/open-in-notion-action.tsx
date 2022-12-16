import { Action } from '@raycast/api'
import { getNotionIcon } from '../../../utils/get-notion-icon'

export function OpenInNotionAction({ url }: { url: string }) {
  return (
    <Action.OpenInBrowser
      title="Open in Notion App"
      icon={{ source: getNotionIcon() }}
      url={url}
      shortcut={{ modifiers: ['cmd'], key: 'o' }}
    />
  )
}
