import { List, ActionPanel, Action, Image } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

const STARKSCAN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
};

const formatNumber = (str: string): string => {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<
    { name: string; id: string; username: string; profile_image_url: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      const promises = [axios.get(`https://api.getcharged.dev/v1/starknet/builders`)];

      const [builders] = await Promise.all(promises);

      setListItems(builders.data.builders);
      setListLoading(false);
    })();
  }, []);

  return (
    <List isLoading={listLoading} navigationTitle="Fetched from Starkscan">
      {listItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          icon={{ source: item.profile_image_url, mask: Image.Mask.Circle }}
          actions={
            <ActionPanel title="Open in browser">
              <Action.OpenInBrowser url={`https://twitter.com/${item.username}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
