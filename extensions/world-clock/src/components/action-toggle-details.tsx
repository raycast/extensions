import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { localStorageKey } from "../utils/costants";
import { MutatePromise } from "@raycast/utils";

export function ActionToggleDetails(props: {
  showDetail: boolean;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const { showDetail, showDetailMutate } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Sidebar}
        title={"Toggle Details"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "d" }}
        onAction={async () => {
          await LocalStorage.setItem(localStorageKey.SHOW_DETAILS, !showDetail);
          if (showDetailMutate) {
            await showDetailMutate();
          }
        }}
      />
    </ActionPanel.Section>
  );
}
