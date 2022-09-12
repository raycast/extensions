import React, { useState } from "react";
import { ShortcutSource, tags } from "../util/shortcut";
import { ActionPanel, Color, List } from "@raycast/api";
import { ActionEditShortcut } from "./action-edit-shortcut";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Preferences } from "../types/preferences";
import { ActionRunShortcut } from "./action-run-shortcut";
import { getShortcuts, getShortcutsListDetail } from "../hooks/hooks";

export function ShortcutLibraryListLayout(props: { preferences: Preferences }) {
  const { preferences } = props;

  const [tag, setTag] = useState<string>("All");
  const [refresh, setRefresh] = useState<number>(0);
  const [selectId, setSelectId] = useState<number>(0);

  const { allShortcuts, userShortcuts, loading } = getShortcuts(refresh, preferences);
  const { detail } = getShortcutsListDetail(allShortcuts, selectId, refresh);
  return (
    <List
      isShowingDetail={preferences.showDetail}
      isLoading={loading}
      searchBarPlaceholder={"Search shortcuts"}
      onSelectionChange={async (id) => {
        setSelectId(Number(id));
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
      {allShortcuts.map((value, index) => {
        if (value.info.tag.includes(tag) || tag === "All") {
          return (
            <List.Item
              id={index + ""}
              icon={{
                source: value.info.icon,
                tintColor: value.info.iconColor,
              }}
              title={value.info.name}
              accessories={[
                preferences.showTag
                  ? {
                      text: value.info.tag[0],
                      tooltip: `${value.info.tag.join(", ")}`,
                    }
                  : {},
              ]}
              key={index}
              detail={<List.Item.Detail markdown={`${detail}`} />}
              actions={(() => {
                return (
                  <>
                    <ActionPanel>
                      <ActionRunShortcut
                        primaryAction={preferences.primaryAction}
                        closeMainWindow={preferences.closeMainWindow}
                        tactions={value.tactions}
                      />
                      <ActionEditShortcut
                        shortcut={value}
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
      })}
    </List>
  );
}
