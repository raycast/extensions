import { Action, Icon } from '@raycast/api'

export function OpenOnNotionAction({ url }: { url: string }) {
  return (
    <Action.OpenInBrowser
      title="Open on Notion"
      icon={{ source: Icon.Link }}
      url={url}
      shortcut={{ modifiers: ['cmd'], key: 'o' }}
    />
  )
}
