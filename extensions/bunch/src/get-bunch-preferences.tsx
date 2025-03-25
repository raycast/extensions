import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import React, { useState } from "react";
import { getBunchPreferences } from "./hooks/hooks";
import { EmptyView } from "./components/empty-view";
import { spawnSync } from "child_process";
import { bunchInstalled } from "./utils/common-utils";
import { BunchNotInstallView } from "./components/bunch-not-install-view";
import { ActionOpenFolder } from "./components/action-open-folder";

export default function GetBunchPreferences() {
  const [refresh, setRefresh] = useState<number>(0);
  const { bunchPreferences, loading } = getBunchPreferences(refresh);

  return bunchInstalled() ? (
    <List isLoading={loading} searchBarPlaceholder={"Search preferences"}>
      <EmptyView title={"No Preferences"} extensionPreferences={false} />
      {bunchPreferences.map((value, index) => {
        return (
          <List.Item
            icon={buildIcon(value.value)}
            key={index}
            title={value.title}
            subtitle={value.subtitle}
            actions={
              <ActionPanel>
                {value.title === "Bunch Folder" && <ActionOpenFolder />}
                {value.title === "Toggle Bunches" && (
                  <Action
                    icon={Icon.Gear}
                    title={"Toggle Toggle Bunches"}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      spawnSync(`open`, [`x-bunch://setPref?toggleBunches=${value.value === "0" ? "1" : "0"}`], {
                        shell: true,
                      });
                      setRefresh(Date.now());
                    }}
                  />
                )}
                {value.title === "Single Bunch Mode" && (
                  <Action
                    icon={Icon.Gear}
                    title={"Toggle Single Bunch Mode"}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      spawnSync(`open`, [`x-bunch://setPref?singleBunchMode=${value.value === "0" ? "1" : "0"}`], {
                        shell: true,
                      });
                      setRefresh(Date.now());
                    }}
                  />
                )}
                {value.title === "Remember Open Bunches" && (
                  <Action
                    icon={Icon.Gear}
                    title={"Toggle Remember Open Bunches"}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      spawnSync(`open`, [`x-bunch://setPref?preserveOpenBunches=${value.value === "0" ? "1" : "0"}`], {
                        shell: true,
                      });
                      setRefresh(Date.now());
                    }}
                  />
                )}
                <Action
                  icon={Icon.Gear}
                  title={"Open Bunch Preferences"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
                  onAction={() => {
                    open("x-bunch://prefs").then();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  ) : (
    <List>
      <BunchNotInstallView extensionPreferences={false} />
    </List>
  );
}

const buildIcon = (value: string) => {
  switch (value) {
    case "0":
      return Icon.Circle;
    case "1":
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case "2":
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case "3":
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case "4":
      return { source: Icon.Checkmark, tintColor: Color.Green };
    default:
      return { source: Icon.Folder, tintColor: Color.Green };
  }
};
