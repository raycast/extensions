import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { appleScriptTerminalCommand, connectToServerCommand, serversList } from "./utils";
import { useMemo, useState } from "react";
import { useFavorite } from "./hooks/use-favorite";

async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    await runAppleScript(appleScriptTerminalCommand(prefs.terminal.name, connectToServerCommand(name, prefs.username)));
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

interface Item {
  spec: { hostname: string };
}

export default function Command() {
  const { data, isLoading } = serversList();
  const [searchText, setSearchText] = useState("");
  const { list, toggleFavorite } = useFavorite<string>("servers");
  let results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  if (searchText.length > 0) {
    results = results.filter((item: Item) => item.spec.hostname.toLowerCase().includes(searchText.toLowerCase()));
  }

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {results
        .sort((itemA: Item, itemB: Item) => {
          if (list.has(itemA.spec.hostname) && list.has(itemB.spec.hostname)) {
            return itemA.spec.hostname.localeCompare(itemB.spec.hostname);
          }

          if (list.has(itemA.spec.hostname)) {
            return -1;
          }

          if (list.has(itemB.spec.hostname)) {
            return 1;
          }

          return itemA.spec.hostname.localeCompare(itemB.spec.hostname);
        })
        .map((item: Item, index: number) => {
          const hostname = item.spec.hostname;

          return (
            <List.Item
              key={hostname + index}
              icon={{ source: Icon.Dot, tintColor: Color.Green }}
              title={hostname}
              accessories={[
                {
                  icon: list.has(hostname)
                    ? {
                        source: Icon.Star,
                        tintColor: Color.Yellow,
                      }
                    : undefined,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.Terminal} onAction={() => open(hostname)} />
                  <Action
                    title={list.has(hostname) ? "Unfavorite" : "Favorite"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    icon={Icon.Star}
                    onAction={() => toggleFavorite(hostname)}
                  />
                  <Action.CopyToClipboard content={hostname} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
