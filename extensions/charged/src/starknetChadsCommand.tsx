import { List, ActionPanel, Action, Image } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import * as analytics from "./utils/analytics";

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<
    { name: string; id: string; username: string; profile_image_url: string }[]
  >([]);

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_CHADS");
  }, []);

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
              <Action.OpenInBrowser
                onOpen={() =>
                  analytics.trackEvent("CHADS_OPEN_TWITTER", {
                    user: item.username,
                  })
                }
                url={`https://twitter.com/${item.username}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
