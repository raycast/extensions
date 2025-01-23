import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import React, { useState } from "react";
import { getShortcuts } from "../hooks/hooks";
import { Preferences } from "../types/preferences";
import { Shortcut, tags } from "../util/shortcut";
import { ActionEditShortcut } from "./action-edit-shortcut";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ActionRunShortcut } from "./action-run-shortcut";
import { ShortcutsEmptyView } from "./shortcuts-empty-view";

export function ShortcutLibraryGridLayout(props: { preferences: Preferences }) {
  const { preferences } = props;

  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);

  const { userShortcuts, buildInShortcuts, loading } = getShortcuts(refresh, preferences);
  const {
    data: sortedCustomData,
    visitItem: visitCustomItem,
    resetRanking: resetCustomRanking,
  } = useFrecencySorting(userShortcuts);
  const {
    data: sortedBuildInData,
    visitItem: visitBuildInItem,
    resetRanking: resetBuildInRanking,
  } = useFrecencySorting(buildInShortcuts);

  return (
    <Grid
      columns={parseInt(preferences.columns)}
      aspectRatio={"3/2"}
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
      <ShortcutsEmptyView setRefresh={setRefresh} />
      <Grid.Section title={"Custom"}>
        {sortedCustomData.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              <GridItem
                key={value.id}
                index={index}
                shortcuts={sortedCustomData}
                shortcut={value}
                preferences={preferences}
                setRefresh={setRefresh}
                visitItem={visitCustomItem}
                resetRanking={resetCustomRanking}
              />
            );
          }
        })}
      </Grid.Section>
      <Grid.Section title={"Build-in"}>
        {buildInShortcuts.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              <GridItem
                key={value.id}
                index={index}
                shortcuts={sortedBuildInData}
                shortcut={value}
                preferences={preferences}
                setRefresh={setRefresh}
                visitItem={visitBuildInItem}
                resetRanking={resetBuildInRanking}
              />
            );
          }
        })}
      </Grid.Section>
    </Grid>
  );
}

function GridItem(props: {
  index: number;
  shortcuts: Shortcut[];
  shortcut: Shortcut;
  preferences: Preferences;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  visitItem: (item: Shortcut) => void;
  resetRanking: (item: Shortcut) => void;
}) {
  const { index, shortcuts, shortcut, preferences, setRefresh, visitItem, resetRanking } = props;
  return (
    <Grid.Item
      id={shortcut.id}
      keywords={shortcut.info.tag}
      key={shortcut.id}
      accessory={{
        icon: { source: Icon.Hashtag, tintColor: shortcut.info.iconColor },
        tooltip: shortcut.info.tag.join(", "),
      }}
      content={{
        value: { source: shortcut.info.icon, tintColor: shortcut.info.iconColor },
        tooltip: shortcut.info.name,
      }}
      title={shortcut.info.name}
      actions={(() => {
        return (
          <>
            <ActionPanel>
              <ActionRunShortcut
                primaryAction={preferences.primaryAction}
                closeMainWindow={preferences.closeMainWindow}
                shortcut={shortcut}
                visitItem={visitItem}
              />
              <ActionEditShortcut shortcut={shortcut} index={index} userShortcuts={shortcuts} setRefresh={setRefresh} />
              <ActionPanel.Section>
                <Action
                  icon={Icon.ArrowCounterClockwise}
                  title="Reset Ranking"
                  shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
                  onAction={() => resetRanking(shortcut)}
                />
              </ActionPanel.Section>
              <ActionOpenPreferences />
            </ActionPanel>
          </>
        );
      })()}
    />
  );
}
