import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { applicationsList, capitalize, connectToApplication } from "./utils";
import { useMemo, useState } from "react";
import { useFavorite } from "./hooks/use-favorite";

async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  try {
    connectToApplication(name);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

interface Item {
  metadata: { name: string };
  spec: { public_addr: string };
}

export default function Command() {
  const { data, isLoading } = applicationsList();
  const [searchText, setSearchText] = useState("");
  const { list, toggleFavorite } = useFavorite<string>("applications");
  let results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  if (searchText.length > 0) {
    results = results.filter((item: Item) => item.metadata.name.toLowerCase().includes(searchText.toLowerCase()));
  }

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {results
        .sort((itemA: Item, itemB: Item) => {
          if (list.has(itemA.metadata.name) && list.has(itemB.metadata.name)) {
            return itemA.metadata.name.localeCompare(itemB.metadata.name);
          }

          if (list.has(itemA.metadata.name)) {
            return -1;
          }

          if (list.has(itemB.metadata.name)) {
            return 1;
          }

          return itemA.metadata.name.localeCompare(itemB.metadata.name);
        })
        .map((item: Item, index: number) => {
          const name = item.metadata.name;
          const public_addr = item.spec.public_addr;

          return (
            <List.Item
              key={name + index}
              title={name}
              icon={{ source: Icon.Dot, tintColor: Color.Green }}
              subtitle={public_addr}
              accessories={[{ icon: list.has(name) ? { source: Icon.Star, tintColor: Color.Yellow } : undefined }]}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.Window} onAction={() => open(name)} />
                  <Action
                    title={list.has(name) ? "Unfavorite" : "Favorite"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    icon={Icon.Star}
                    onAction={() => toggleFavorite(name)}
                  />
                  <Action.CopyToClipboard content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
