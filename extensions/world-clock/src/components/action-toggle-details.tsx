import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import { localStorageKey } from "../utils/costants";

export function ActionToggleDetails(props: { showDetail: boolean; setRefresh: Dispatch<SetStateAction<number>> }) {
  const { showDetail, setRefresh } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Sidebar}
        title={"Toggle Details"}
        shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
        onAction={async () => {
          await LocalStorage.setItem(localStorageKey.SHOW_DETAILS, !showDetail);
          setRefresh(Date.now());
        }}
      />
    </ActionPanel.Section>
  );
}
