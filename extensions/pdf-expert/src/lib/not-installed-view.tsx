import { Icon, List } from "@raycast/api";
import { useEffect } from "react";

export function useLoadOnMount(load: () => void) {
  useEffect(() => {
    load();
  }, [load]);
}

export function NotInstalledList() {
  return (
    <List>
      <List.EmptyView
        title="PDF Expert Is Not Installed"
        description="Install PDF Expert from the App Store to use this extension"
        icon={Icon.Warning}
      />
    </List>
  );
}
