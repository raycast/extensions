import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { cache, HttpService, KEY } from "./service";

HttpService.fetch();
export default function Command() {
  const [items, setItems] = useCachedState<HttpService[]>(KEY);

  const set = () => {
    setItems(HttpService.services);
  };

  setTimeout(set, 3 * 1000);
  cache.subscribe(set);

  return (
    <List isLoading={!items} isShowingDetail={true}>
      {items?.map((service: HttpService, index: number) => {
        return (
          <List.Item
            key={index}
            title={service.name}
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
                      {service.addresses?.map((address, index) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={index}
                          text={address}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Referer"
                      text={service.referer?.address}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={service.origin} />
                <Action.CopyToClipboard
                  content={service.origin}
                  title="Copy URL to Clipboard"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
