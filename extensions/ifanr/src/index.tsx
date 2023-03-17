import { useRef } from "react";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { feed } from "./feed";
import { getIcon } from "./utils";

export default function Command() {
  const abortable = useRef<AbortController>();

  const { isLoading, data } = usePromise(
    async () => {
      const result = await feed();
      return result;
    },
    [],
    {
      abortable,
    }
  );

  return (
    <List isLoading={isLoading}>
      {data &&
        data.map((item, index) => (
          <List.Item
            icon={getIcon(index + 1)}
            key={index}
            title={item.title}
            accessories={[{ text: item.author, icon: Icon.Person }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
