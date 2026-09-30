import { Action, ActionPanel, Icon, Keyboard, List, open } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { useEffect } from 'react'
import { cache, Http, HttpService, KEY } from './service'
import { useServiceStatuses } from './use-service-statuses'

Http.fetch()
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY)
  const statuses = useServiceStatuses(items)

  useEffect(() => {
    const set = () => {
      setItems(Http.services)
    }

    const interval = setInterval(set, 3 * 1000)
    const unsubscribe = cache.subscribe(set)
    set()

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [setItems])

  return (
    <List isLoading={!items} isShowingDetail={!!items?.length}>
      {items?.map((service: HttpService, index: number) => {
        return (
          <List.Item
            key={index}
            title={service.name}
            icon={{
              source: Icon.CircleFilled,
              tintColor: statuses[service.url],
            }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Location"
                      target={service.url}
                      text={service.url}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Host"
                      text={service.fqdn}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Addresses">
                      {service.addresses?.map((address, index) => {
                        const url = service.urls[index]

                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={index}
                            text={address}
                            color={statuses[url]}
                            onAction={() => {
                              open(url)
                            }}
                          />
                        )
                      })}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Referer"
                      text={`${service.referer?.address
                      }:${service.referer?.port}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={service.url} />
                <Action.CopyToClipboard
                  title="Copy URL to Clipboard"
                  content={service.url}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => {
                      cache.clear()
                      Http.fetch()
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
