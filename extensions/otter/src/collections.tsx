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

export const Collections = () => {
  const { data: metadata, isLoading } = useMeta()
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter…" isShowingDetail>
      {metadata?.collections?.length ? (
        metadata?.collections.map(({ bookmark_count, collection, tags }) => {
          if (!collection) {
            return null
          }
          return (
            <List.Item
              key={collection}
              title={collection}
              icon={Icon.Folder}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={urlJoin(prefs.otterBasePath, 'collection', collection)}
                    title="Open Collection in Otter"
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="URL"
                        target={urlJoin(
                          prefs.otterBasePath,
                          'collection',
                          collection,
                        )}
                        text={urlJoin(
                          prefs.otterBasePath,
                          'collection',
                          collection,
                        )}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Count"
                        text={bookmark_count?.toString() ?? '0'}
                      />
                      {tags?.length ? (
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {tags?.map((tag) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              text={tag}
                              icon={Icon.Hashtag}
                              key={`detail-tag-${tag}`}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
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
      <Collections />
    </Authenticated>
  )
}
