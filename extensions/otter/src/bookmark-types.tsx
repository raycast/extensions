import { Action, ActionPanel, List, getPreferenceValues } from '@raycast/api'
import urlJoin from 'proper-url-join'
import formatTitle from 'title'
import { useMeta } from './useMeta'
import { NoItems } from './components/NoItems'
import { Authenticated } from './components/Authenticated'
import { typeToIcon } from './utils/typeToIcon'

const prefs = getPreferenceValues()

export const Types = () => {
  const { data: metadata, isLoading } = useMeta()

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter…">
      {metadata?.types?.length ? (
        metadata?.types.map(({ count, type }) => {
          if (!type) {
            return null
          }

          return (
            <List.Item
              key={type}
              title={formatTitle(type)}
              subtitle={count?.toString() || ''}
              icon={typeToIcon(type)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={urlJoin(prefs.otterBasePath, 'type', type)}
                    title="Open Type in Otter"
                  />
                </ActionPanel>
              }
            />
          )
        })
      ) : (
        <NoItems />
      )}
    </List>
  )
}

export default function Command() {
  return (
    <Authenticated>
      <Types />
    </Authenticated>
  )
}
