import { Action, Icon } from '@raycast/api'

type OpenNotionActionProps = {
  notionDbUrl: string
}
export function OpenNotionAction({ notionDbUrl }: OpenNotionActionProps) {
  return (
    <Action.OpenInBrowser
      title="Open Notion"
      icon={Icon.Binoculars}
      url={notionDbUrl}
      shortcut={{ modifiers: ['cmd'], key: 'n' }}
    />
  )
}
