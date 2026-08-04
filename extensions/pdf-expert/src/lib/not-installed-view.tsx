import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";

export function useLoadOnMount(load: () => void) {
  useEffect(() => {
    load();
  }, [load]);
}

const PDF_EXPERT_APP_STORE_URL =
  "https://apps.apple.com/app/pdf-expert-edit-sign-pdfs/id1055273043";

export function NotInstalledList() {
  return (
    <List>
      <List.EmptyView
        title="PDF Expert Is Not Installed"
        description="Install PDF Expert from the App Store to use this extension"
        icon={Icon.Warning}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Install PDF Expert"
              url={PDF_EXPERT_APP_STORE_URL}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
