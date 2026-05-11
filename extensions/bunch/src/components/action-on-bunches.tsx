import { Action, ActionPanel, Color, Icon, LocalStorage, open, showHUD, showToast, Toast, trash } from "@raycast/api";
import { BunchesInfo } from "../types/types";
import { Dispatch, SetStateAction } from "react";
import { spawnSync } from "child_process";
import { LocalStorageKey } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";
import { alertDialog } from "../hooks/hooks";
import { ActionOpenFolder } from "./action-open-folder";
import Style = Toast.Style;

export function ActionOnBunches(props: {
  bunches: BunchesInfo;
  allBunches: string[];
  setAllBunches: Dispatch<SetStateAction<string[]>>;
  bunchFolder: string;
  openBunches: string[];
  setRefresh: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
}) {
  const { bunches, allBunches, setAllBunches, bunchFolder, openBunches, setRefresh, showDetail } = props;
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
          await open(encodeURI(`x-bunch://toggle/${bunches.name}`));
          await showHUD((bunches.isOpen ? "Close " : "Open ") + "bunches: " + bunches.name);
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
        <ActionOpenFolder />
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
                  await open(encodeURI(`x-bunch://close/${openBunches.join(",")}`));
                  await showHUD("Close bunches: " + openBunches.join(", "));
                  setRefresh(Date.now());
                },
              ).then();
            }}
          />
        )}
      </ActionPanel.Section>
      {!bunches.isOpen && (
        <ActionPanel.Section>
          <Action
            icon={Icon.Trash}
            title={"Remove Bunches"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              alertDialog(
                Icon.Trash,
                `Remove ${bunches.name}`,
                `Are you sure you want to remove bunches ${bunches.name}?`,
                "Remove",
                async () => {
                  try {
                    await trash(bunchFolder + "/" + bunches.name + ".bunch");

                    const _allBunches = [...allBunches];
                    _allBunches.splice(_allBunches.indexOf(bunches.name), 1);
                    console.debug("Remove bunch: " + JSON.stringify(_allBunches));
                    setAllBunches(_allBunches);
                    setRefresh(Date.now());
                    await showToast(Style.Success, "Remove bunches: " + bunches.name);
                  } catch (e) {
                    await showToast(Style.Failure, String(e));
                  }
                },
              ).then();
            }}
          />
        </ActionPanel.Section>
      )}
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
