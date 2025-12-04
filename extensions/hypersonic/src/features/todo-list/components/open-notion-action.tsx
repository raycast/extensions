import { notion } from '@/utils/icons'
import { Action } from '@raycast/api'

type OpenNotionActionProps = {
  notionDbUrl: string
}
export function OpenNotionAction({ notionDbUrl }: OpenNotionActionProps) {
  return (
    <Action.OpenInBrowser
      title="Open Notion Database"
      icon={{ source: notion }}
      url={notionDbUrl}
      shortcut={{ modifiers: ['cmd'], key: 'n' }}
    />
  )
}
