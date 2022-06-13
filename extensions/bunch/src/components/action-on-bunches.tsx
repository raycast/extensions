import { Action, ActionPanel, Color, Icon, open, showHUD, showToast, Toast } from "@raycast/api";
import { BunchesInfo } from "../types/types";
import { Dispatch, SetStateAction } from "react";
import { spawnSync } from "child_process";
import Style = Toast.Style;

export function ActionOnBunches(props: { bunches: BunchesInfo; setRefresh: Dispatch<SetStateAction<number>> }) {
  const { bunches, setRefresh } = props;
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
          setRefresh(Date.now());
          await showHUD((bunches.isOpen ? "Close " : "Open ") + "bunch: " + bunches.name);
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
      </ActionPanel.Section>
    </ActionPanel>
  );
}
