import { Action, ActionPanel, Color, Icon, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { BunchesInfo } from "../types/types";
import { Dispatch, SetStateAction } from "react";
import { spawnSync } from "child_process";
import { LocalStorageKey } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import { alertDialog } from "../hooks/hooks";
import Style = Toast.Style;

export function ActionOnBunches(props: {
  bunches: BunchesInfo;
  openBunches: string[];
  setRefresh: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
  closeMainWindow: boolean;
}) {
  const { bunches, openBunches, setRefresh, showDetail, closeMainWindow } = props;
  return (
    <ActionPanel>
      <Action
        icon={{
          source: bunches.isOpen ? "solid-circle.png" : Icon.Circle,
          tintColor: bunches.isOpen ? Color.PrimaryText : undefined,
        }}
        title={bunches.isOpen ? "Close" : "Open"}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onAction={async () => {
          if (closeMainWindow) {
            await open(encodeURI(`x-bunch://toggle/${bunches.name}`));
            await showHUD((bunches.isOpen ? "Close " : "Open ") + "bunches: " + bunches.name);
          } else {
            spawnSync("open", [`x-bunch://toggle/${bunches.name}`], { shell: true });
            await showToast(Style.Success, (bunches.isOpen ? "Close " : "Open ") + "bunches: " + bunches.name);
          }
          setRefresh(Date.now());
        }}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.Pencil}
          title={"Edit Bunches"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={async () => {
            await open(encodeURI(`x-bunch://edit/${bunches.name}`));
            await showHUD("Edit bunches: " + bunches.name);
          }}
        />
        <Action
          icon={Icon.Finder}
          title={"Open Bunch Folder"}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => {
            await open(encodeURI("x-bunch://reveal"));
            await showHUD("Open Bunch Folder");
          }}
        />
        <Action
          icon={Icon.TwoArrowsClockwise}
          title={"Refresh Bunch Folder"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            spawnSync(`open`, [`x-bunch://refresh`], {
              shell: true,
            });
            setRefresh(Date.now());
            showToast(Style.Success, "Refresh folder successfully.").then();
          }}
        />
        {openBunches.length > 0 && (
          <Action
            icon={Icon.XmarkCircle}
            title={"Close All Bunches"}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
            onAction={() => {
              alertDialog(
                Icon.XmarkCircle,
                "Close All Bunches",
                "Are you sure you want to close all bunches?",
                "Close All",
                async () => {
                  if (closeMainWindow) {
                    await open(encodeURI(`x-bunch://close/${openBunches.join(",")}`));
                    await showHUD("Close bunches: " + openBunches.join(", "));
                  } else {
                    spawnSync("open", [`x-bunch://close/${openBunches.join(",")}`], { shell: true });
                    await showToast(Style.Success, "Close bunches: " + openBunches.join(", "));
                  }
                  setRefresh(Date.now());
                }
              ).then();
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Sidebar}
          title={"Toggle Details"}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
          onAction={async () => {
            await LocalStorage.setItem(LocalStorageKey.DETAIL_KEY, !showDetail);
            setRefresh(Date.now());
          }}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
