import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import React from "react";
import { getBunchPreferences } from "./hooks/hooks";
import { EmptyView } from "./components/empty-view";

export default function GetBunchPreferences() {
  const { bunchPreferences, loading } = getBunchPreferences();

  return (
    <List isLoading={loading} searchBarPlaceholder={"Search preferences"}>
      <EmptyView title={"No Preferences"} />

      <List.Section title={"Closed"}>
        {bunchPreferences.map((value, index) => {
          return (
            <List.Item
              icon={Icon.Gear}
              key={index}
              title={value.title}
              subtitle={value.value}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Finder}
                    title={"Open Bunch Folder"}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      open(bunchPreferences[0].value).then(() => {
                        showHUD("Open: " + bunchPreferences[0].value).then();
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
