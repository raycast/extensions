import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Bonjour, { Service } from "bonjour-service";
import { useEffect, useState } from "react";

export default function Command() {
  const [items, setItems] = useState<Service[]>();

  useEffect(() => {
    const services: Service[] = [];

    new Bonjour().find({ type: "http" }, (service: Service) => {
      services.push(service);
      setItems(services);
    });
  }, []);

  return (
    <List isLoading={!items}>
      {items?.map((service: Service, index: number) => {
        const url = `http://${service.host}`;

        return (
          <List.Item
            key={index}
            icon={Icon.Globe}
            title={service.name}
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
