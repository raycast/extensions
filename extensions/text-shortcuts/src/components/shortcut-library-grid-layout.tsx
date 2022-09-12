import React, { useState } from "react";
import { Shortcut, ShortcutSource, tags } from "../util/shortcut";
import { ActionPanel, Grid } from "@raycast/api";
import { ActionEditShortcut } from "./action-edit-shortcut";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Preferences } from "../types/preferences";
import { ActionRunShortcut } from "./action-run-shortcut";
import { getShortcuts } from "../hooks/hooks";

export function ShortcutLibraryGridLayout(props: { preferences: Preferences }) {
  const { preferences } = props;

  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);

  const { allShortcuts, userShortcuts, loading } = getShortcuts(refresh, preferences);
  return (
    <Grid
      itemSize={preferences.itemSize as Grid.ItemSize}
      inset={preferences.itemInset === "" ? undefined : (preferences.itemInset as Grid.Inset)}
      isLoading={loading}
      searchBarPlaceholder={"Search shortcuts"}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Shortcut Tags" storeValue={preferences.rememberTag} onChange={setTag}>
          <Grid.Dropdown.Item key={"all"} title={"All"} value={"All"} />
          {tags.map((value) => {
            return <Grid.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </Grid.Dropdown>
      }
    >
      <Grid.Section title={"Custom"}>
        {allShortcuts.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              value.info.source === ShortcutSource.USER && (
                <GridItem
                  key={value.info.id}
                  index={index}
                  userShortcuts={userShortcuts}
                  shortcut={value}
                  preferences={preferences}
                  setRefresh={setRefresh}
                />
              )
            );
          }
        })}
      </Grid.Section>
      <Grid.Section title={"Build-in"}>
        {allShortcuts.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              value.info.source === ShortcutSource.BUILD_IN && (
                <GridItem
                  key={value.info.id}
                  index={index}
                  userShortcuts={userShortcuts}
                  shortcut={value}
                  preferences={preferences}
                  setRefresh={setRefresh}
                />
              )
            );
          }
        })}
      </Grid.Section>
    </Grid>
  );
}

export function GridItem(props: {
  index: number;
  userShortcuts: Shortcut[];
  shortcut: Shortcut;
  preferences: Preferences;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { index, userShortcuts, shortcut, preferences, setRefresh } = props;
  return (
    <Grid.Item
      keywords={shortcut.info.tag}
      content={{
        value: { source: shortcut.info.icon, tintColor: shortcut.info.iconColor },
        tooltip:
          shortcut.info.name +
          "\n" +
          "_".repeat(shortcut.info.name.length) +
          "\n\nTag: " +
          shortcut.info.tag.join(", "),
      }}
      title={shortcut.info.name}
      actions={(() => {
        return (
          <>
            <ActionPanel>
              <ActionRunShortcut
                primaryAction={preferences.primaryAction}
                closeMainWindow={preferences.closeMainWindow}
                tactions={shortcut.tactions}
              />
              <ActionEditShortcut
                shortcut={shortcut}
                index={index}
                userShortcuts={userShortcuts}
                setRefresh={setRefresh}
              />
              <ActionOpenPreferences />
            </ActionPanel>
          </>
        );
      })()}
    />
  );
}
