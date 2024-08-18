import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Bonjour, { Service } from "bonjour-service";
import { useState } from "react";

const bonjour = new Bonjour();
const services: { [key: string]: Service } = {};

export default function Command() {
  const [items, setItems] = useState<{ [key: string]: Service }>();

  bonjour.find({ type: "http" }, (service) => {
    services[service.name] = service;
    setItems(services);
  });

  return (
    <List isLoading={!items} isShowingDetail={true}>
      {items &&
        Object.values(items)
          ?.sort((a, b) => {
            return a.name.localeCompare(b.name);
          })
          .map((service: Service, index: number) => {
            const url = `${service.type}://${service.host}:${service.port}`;

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
                          target={url}
                          text={url}
                          title="Location"
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
