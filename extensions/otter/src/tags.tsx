import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from '@raycast/api'
import urlJoin from 'proper-url-join'
import { useMeta } from './useMeta'
import { NoItems } from './components/NoItems'
import { Authenticated } from './components/Authenticated'

const prefs = getPreferenceValues()

export const Tags = () => {
  const { data: metadata, isLoading } = useMeta()

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter…">
      {metadata?.tags?.length ? (
        metadata?.tags.map(({ count, tag }) => {
          if (!tag) {
            return null
          }
          return (
            <List.Item
              key={tag}
              title={tag}
              subtitle={count?.toString() || ''}
              icon={tag === 'Untagged' ? Icon.ArrowRight : Icon.Hashtag}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={urlJoin(prefs.otterBasePath, 'tag', tag)}
                    title="Open Tag in Otter"
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
      <Tags />
    </Authenticated>
  )
}
