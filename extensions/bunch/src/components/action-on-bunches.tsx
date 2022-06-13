import { Action, ActionPanel, Color, Icon, showHUD } from "@raycast/api";
import { BunchesInfo } from "../types/types";
import { scriptToRefreshBrowsersByName, scriptToToggleBunches } from "../utils/applescript-utils";
import { Dispatch, SetStateAction } from "react";

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
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={async () => {
          await scriptToToggleBunches(bunches);
          setRefresh(Date.now());
          await showHUD((bunches.isOpen ? "Close " : "Open ") + "bunch: " + bunches.name);
        }}
      />
      <Action
        icon={Icon.TwoArrowsClockwise}
        title={"Refresh Browsers"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={async () => {
          const result = await scriptToRefreshBrowsersByName(bunches.name);
          await showHUD(result);
        }}
      />
    </ActionPanel>
  );
}
