import { useState } from "react";
import { Action, ActionPanel, Clipboard, Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Item = {
  id: number;
  imageUrl: string;
};

function formatImageMarkdown(imageUrl: string) {
  return `[![LGTMeow](${imageUrl})](https://lgtmeow.com)`;
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);

  const { isLoading } = useFetch<Item[]>("https://lgtmeow.com/api/lgtm-images", {
    onData: (data) => {
      const newItems: Item[] = [];
      for (const item of data) {
        newItems.push(item);
      }
      setItems(newItems);
    },
  });

  return (
    <Grid
      isLoading={isLoading}
      inset={Grid.Inset.Zero}
      filtering={false}
      navigationTitle="Choose Image"
      searchBarPlaceholder=""
    >
      {items.map((item) => (
        <Grid.Item
          id={item.imageUrl}
          key={item.id}
          content={item.imageUrl}
          actions={
            <ActionPanel title="Choose Image">
              <Action.CopyToClipboard title="Copy URL" content={formatImageMarkdown(item.imageUrl)} />
              <Action.CopyToClipboard
                title="Copy URL & Paste to Frontmost App"
                content={formatImageMarkdown(item.imageUrl)}
                onCopy={Clipboard.paste}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
