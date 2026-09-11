import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise, useLocalStorage } from "@raycast/utils";
import { getKeymaps, clearCache } from "./lib/commands";
import { layout } from "./lib/preferences";

export default function NeovimCommands() {
  const { data, isLoading, error, revalidate } = usePromise(() => getKeymaps());
  const { value: favorites = [], setValue: setFavorites } = useLocalStorage<string[]>("neovim-keymap-favorites");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Failed to load keymaps");
  }, [error]);

  const filtered = data?.filter((km) => {
    if (filter === "favorites") return favorites.includes(km.lhs);
    return true;
  });

  const filterAccessory = (
    <List.Dropdown tooltip="Filter" onChange={setFilter}>
      <List.Dropdown.Item icon={Icon.Text} title="All" value="" />
      <List.Dropdown.Item icon={Icon.Star} title="Favorites" value="favorites" />
    </List.Dropdown>
  );

  const refreshAction = (
    <Action
      title="Refresh Keymaps"
      icon={Icon.ArrowClockwise}
      onAction={async () => {
        clearCache();
        await revalidate();
      }}
    />
  );

  function keymapActions(km: { lhs: string; rhs?: string; desc?: string; source?: string }, isFav: boolean) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Keymap" content={km.lhs} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          {km.rhs && (
            <Action.CopyToClipboard title="Copy Command" content={km.rhs} shortcut={Keyboard.Shortcut.Common.Copy} />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {isFav ? (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              onAction={async () => {
                await setFavorites(favorites.filter((f) => f !== km.lhs));
              }}
            />
          ) : (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                await setFavorites([...favorites, km.lhs]);
              }}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
      </ActionPanel>
    );
  }

  if (layout === "grid") {
    return (
      <Grid
        isLoading={isLoading}
        searchBarPlaceholder="Search Neovim keymaps..."
        columns={5}
        searchBarAccessory={
          <Grid.Dropdown tooltip="Filter" onChange={setFilter}>
            <Grid.Dropdown.Item icon={Icon.Text} title="All" value="" />
            <Grid.Dropdown.Item icon={Icon.Star} title="Favorites" value="favorites" />
          </Grid.Dropdown>
        }
      >
        <Grid.Section title={filter === "favorites" ? "Favorites" : "All Keymaps"}>
          {filtered?.map((km, i) => {
            const isFav = favorites.includes(km.lhs);
            return (
              <Grid.Item
                key={`${km.lhs}-${i}`}
                title={km.lhs}
                subtitle={km.desc || km.rhs}
                content={Icon.Keyboard}
                keywords={[km.source || "", km.desc || ""]}
                actions={keymapActions(km, isFav)}
              />
            );
          })}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Neovim keymaps..."
      searchBarAccessory={filterAccessory}
      actions={<ActionPanel>{refreshAction}</ActionPanel>}
    >
      <List.Section title={filter === "favorites" ? "Favorites" : "All Keymaps"} subtitle={`${filtered?.length || 0}`}>
        {filtered?.map((km, i) => {
          const isFav = favorites.includes(km.lhs);
          return (
            <List.Item
              key={`${km.lhs}-${i}`}
              title={km.lhs}
              subtitle={km.desc || km.rhs}
              icon={Icon.Keyboard}
              accessories={[
                isFav ? { icon: Icon.Star } : {},
                km.source && km.source !== "unknown"
                  ? {
                      tag: {
                        value: km.source,
                        color: km.source === "plugin" ? "#f4b8e4" : km.source === "user" ? "#81c8be" : "#838ba7",
                      },
                      tooltip: `Source: ${km.source}`,
                    }
                  : {},
              ]}
              actions={keymapActions(km, isFav)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
