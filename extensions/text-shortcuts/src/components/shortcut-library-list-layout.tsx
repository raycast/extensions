import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import React, { useState } from "react";
import { getShortcuts, getShortcutsListDetail } from "../hooks/hooks";
import { Preferences } from "../types/preferences";
import { Shortcut, tags } from "../util/shortcut";
import { ActionEditShortcut } from "./action-edit-shortcut";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ActionRunShortcut } from "./action-run-shortcut";
import { ShortcutsEmptyView } from "./shortcuts-empty-view";

export function ShortcutLibraryListLayout(props: { preferences: Preferences }) {
  const { preferences } = props;

  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);
  const [selectId, setSelectId] = useState<string>("");
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

  const { detail } = getShortcutsListDetail([...userShortcuts, ...buildInShortcuts], selectId, refresh);

  return (
    <List
      isShowingDetail={preferences.showDetail}
      isLoading={loading}
      searchBarPlaceholder={"Search shortcuts"}
      onSelectionChange={(id) => {
        if (id != null) {
          setSelectId(id);
        }
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Shortcut Tags" storeValue={preferences.rememberTag} onChange={setTag}>
          <List.Dropdown.Item key={"all"} title={"All"} value={"All"} />
          {tags.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      <ShortcutsEmptyView setRefresh={setRefresh} />
      <List.Section title={"Custom"}>
        {sortedCustomData.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              <ListItem
                key={value.id}
                shortcut={value}
                index={index}
                shortcuts={sortedCustomData}
                detail={detail}
                preferences={preferences}
                setRefresh={setRefresh}
                visitItem={visitCustomItem}
                resetRanking={resetCustomRanking}
              />
            );
          }
        })}
      </List.Section>

      <List.Section title={"Build-in"}>
        {sortedBuildInData.map((value, index) => {
          if (value.info.tag.includes(tag) || tag === "All") {
            return (
              <ListItem
                key={value.id}
                shortcut={value}
                index={index}
                shortcuts={sortedBuildInData}
                detail={detail}
                preferences={preferences}
                setRefresh={setRefresh}
                visitItem={visitBuildInItem}
                resetRanking={resetBuildInRanking}
              />
            );
          }
        })}
      </List.Section>
    </List>
  );
}

function ListItem(props: {
  index: number;
  shortcuts: Shortcut[];
  shortcut: Shortcut;
  detail: string;
  preferences: Preferences;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  visitItem: (item: Shortcut) => void;
  resetRanking: (item: Shortcut) => void;
}) {
  const { index, shortcuts, shortcut, detail, preferences, setRefresh, visitItem, resetRanking } = props;
  return (
    <List.Item
      keywords={shortcut.info.tag}
      id={shortcut.id}
      key={shortcut.id}
      icon={{
        source: shortcut.info.icon,
        tintColor: shortcut.info.iconColor,
      }}
      title={shortcut.info.name}
      accessories={[
        preferences.showTag
          ? {
              text: { value: shortcut.info.tag[0], color: shortcut.info.iconColor },
              tooltip: `${shortcut.info.tag.join(", ")}`,
            }
          : {},
      ]}
      detail={<List.Item.Detail markdown={`${detail}`} />}
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
