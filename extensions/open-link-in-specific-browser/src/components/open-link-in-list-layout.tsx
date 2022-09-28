import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { actionIcon, actionTitle, searchBarPlaceholder, searchEngineURLBuilder } from "../utils/open-link-utils";
import { SurfBoardsListItem } from "./open-link-app-list-item";
import { OpenLinkInEmptyView } from "./open-link-in-empty-view";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ItemType, OpenLinkApplication } from "../types/types";

export function OpenLinkInListLayout(props: {
  buildInApps: OpenLinkApplication[];
  customApps: OpenLinkApplication[];
  otherApps: OpenLinkApplication[];
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}) {
  const { buildInApps, customApps, otherApps, itemInput, setRefresh, loading } = props;
  return (
    <List isLoading={loading} searchBarPlaceholder={searchBarPlaceholder(itemInput)}>
      <OpenLinkInEmptyView />

      <List.Section title={"Type: " + itemInput.type + "  Source: " + itemInput.source}>
        <List.Item
          id="Type"
          title={itemInput.content}
          icon={Icon.Text}
          accessories={[{ text: "WordCount  " + itemInput.content.length }]}
          actions={
            <ActionPanel>
              <Action
                title={actionTitle(itemInput, "Default Browser")}
                icon={actionIcon(itemInput)}
                onAction={async () => {
                  if (itemInput.type === ItemType.NULL) {
                    setRefresh(Date.now());
                  } else {
                    await showHUD("Search in default browser");
                    await open(searchEngineURLBuilder(itemInput));
                  }
                }}
              />
              <ActionOpenPreferences />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Custom Apps">
        {customApps.map((browser, index) => {
          return (
            <SurfBoardsListItem
              key={browser.path}
              isCustom={true}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={customApps}
            />
          );
        })}
      </List.Section>
      <List.Section title="Build-In Apps">
        {buildInApps.map((browser, index) => {
          return (
            <SurfBoardsListItem
              key={browser.path}
              isCustom={false}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={buildInApps}
            />
          );
        })}
      </List.Section>
      <List.Section title="Other Apps">
        {otherApps.map((browser, index) => {
          return (
            <SurfBoardsListItem
              key={browser.path}
              isCustom={false}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={otherApps}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
