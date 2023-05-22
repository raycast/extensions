import { List, ActionPanel, Action, Image } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

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
    <List isLoading={listLoading}>
      {listItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          icon={{ source: item.profile_image_url, mask: Image.Mask.Circle }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://twitter.com/${item.username}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
