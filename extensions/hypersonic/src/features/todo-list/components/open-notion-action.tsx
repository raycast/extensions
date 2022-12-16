import { Action } from '@raycast/api'
import { getNotionIcon } from '../../../utils/get-notion-icon'

type OpenNotionActionProps = {
  notionDbUrl: string
}
export function OpenNotionAction({ notionDbUrl }: OpenNotionActionProps) {
  return (
    <Action.OpenInBrowser
      title="Open Notion Database"
      icon={{ source: getNotionIcon() }}
      url={notionDbUrl}
      shortcut={{ modifiers: ['cmd'], key: 'n' }}
    />
  )
}
