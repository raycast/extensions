import { useState } from "react";
import { VaultListEntry } from "../interfaces";
import { listFavorites, removeFromFavorites } from "../utils";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Configuration, Reload } from "./actions";
import { VaultDisplay } from "./display";
import { usePromise } from "@raycast/utils";
import { VaultTree } from "./tree";

export function VaultFavorites() {
  const [keys, setKeys] = useState<VaultListEntry[]>([]);

  const { isLoading, revalidate } = usePromise(async () => {
    setKeys(await listFavorites());
  });

  return (
    <List filtering={true} isLoading={isLoading}>
      <List.EmptyView
        actions={
          <ActionPanel>
            <Configuration />
          </ActionPanel>
        }
      />

      {keys
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((entry) => (
          <List.Item
            key={entry.key}
            title={entry.label}
            icon={
              entry.folder
                ? { source: Icon.Folder, tintColor: Color.Blue }
                : {
                    source: Icon.Document,
                    tintColor: Color.Green,
                  }
            }
            accessories={[
              {
                icon: {
                  source: Icon.Star,
                  tintColor: Color.Yellow,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigation">
                  {entry.folder ? (
                    <Action.Push icon={Icon.ArrowDown} title="Go Inside" target={<VaultTree path={entry.key} />} />
                  ) : (
                    <Action.Push
                      icon={Icon.ArrowDown}
                      title="Retrieve Secret"
                      target={<VaultDisplay path={entry.key} />}
                    />
                  )}
                  <Action
                    icon={Icon.Star}
                    title={"Remove From Favorites"}
                    onAction={() => removeFromFavorites(entry.key, revalidate)}
                  />
                </ActionPanel.Section>
                <Configuration />
                <Reload revalidate={revalidate} />
              </ActionPanel>
            }
          ></List.Item>
        ))}
    </List>
  );
}
