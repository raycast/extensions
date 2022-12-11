import { ActionPanel, List } from '@raycast/api'
import { GeneralActions } from './general-actions'

type EmptyListProps = {
  notionDbUrl: string
  mutatePreferences: () => void
}

const dark = 'empty-dark.gif'
const light = 'empty-light.gif'

export function EmptyList({ notionDbUrl, mutatePreferences }: EmptyListProps) {
  return (
    <List.EmptyView
      icon={{
        source: { light: light, dark: dark },
      }}
      actions={
        <ActionPanel>
          <GeneralActions
            mutatePreferences={mutatePreferences}
            notionDbUrl={notionDbUrl}
          />
        </ActionPanel>
      }
    />
  )
}
