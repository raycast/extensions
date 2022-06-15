import { List, Detail, Toast, showToast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import * as google from "./oauth/google";
import * as twitter from "./oauth/twitter";
import * as dropbox from "./oauth/dropbox";

// Update the service name here for testing different providers
const serviceName = "twitter";

export default function Command() {
  const service = getService(serviceName);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
        const fetchedItems = await service.fetchItems();
        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [service]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {items.map((item) => {
        return <List.Item key={item.id} id={item.id} icon={Icon.TextDocument} title={item.title} />;
      })}
    </List>
  );
}

// Services

function getService(serviceName: string): Service {
  switch (serviceName) {
    case "google":
      return google as Service;
    case "twitter":
      return twitter as Service;
    case "dropbox":
      return dropbox as Service;
    default:
      throw new Error("Unsupported service: " + serviceName);
  }
}

interface Service {
  authorize(): Promise<void>;
  fetchItems(): Promise<{ id: string; title: string }[]>;
}
