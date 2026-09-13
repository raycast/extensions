import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { cache, Http, HttpService, KEY } from './service'

Http.fetch()
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY)

  const set = () => {
    setItems(Http.services)
  }

  setTimeout(set, 3 * 1000)
  cache.subscribe(set)

  return (
    <List isLoading={!items} isShowingDetail={!!items?.length}>
      {items?.map((service: HttpService, index: number) => {
        return (
          <List.Item
            key={index}
            title={service.name}
            icon={{
              source: Icon.CircleFilled,
              tintColor: service.origin.status,
            }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Location"
                      target={service.origin}
                      text={service.origin}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Host"
                      text={service.fqdn}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Addresses">
                      {service.origins?.map((origin, index) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={index}
                          text={origin.split('//')[1]?.split(':')[0]}
                          color={origin.status}
                          onAction={
                            origin.available
                              ? origin.open
                              : undefined
                          }
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Referer"
                      text={`${service.referer?.address}:${service.referer?.port}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={service.origin} />
                <Action.CopyToClipboard
                  title="Copy URL to Clipboard"
                  content={service.origin}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
