import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Bonjour, { Service } from "bonjour-service";
import { useState } from "react";

let services: { [key: string]: Service };
new Bonjour().find({ type: "http" }, (service) => {
  services = {
    ...services,
    [service.name]: service,
  };
});

export default function Command() {
  const [items, setItems] = useState<{ [key: string]: Service }>();

  setInterval(() => {
    setItems(services);
  }, 100);

  return (
    <List isLoading={!items} isShowingDetail={true}>
      {items &&
        Object.values(items)
          ?.sort((a, b) => {
            return a.name.localeCompare(b.name);
          })
          .map((service: Service, index: number) => {
            const url =
              `${service.type}://${service.host}:${service.port}`.toLowerCase();

            return (
              <List.Item
                key={index}
                icon={Icon.Globe}
                title={service.name}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Link
                          title="Location"
                          target={url}
                          text={url}
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
                    <Action.OpenInBrowser url={url} />
                    <Action.CopyToClipboard content={url} />
                  </ActionPanel>
                }
              />
            );
          })}
    </List>
  );
}
