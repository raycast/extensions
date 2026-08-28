import { Action, ActionPanel, Icon } from "@raycast/api";

import { SetupHealthList, SitesPicker } from "./views";

export default function SetupHealth() {
  return (
    <SitesPicker
      title="Kobbe Setup Health"
      searchBarPlaceholder="Choose a site..."
      renderActions={(site, revalidate) => (
        <ActionPanel>
          <Action.Push title="View Setup Health" icon={Icon.Heartbeat} target={<SetupHealthList site={site} />} />
          <Action
            title="Refresh Sites"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      )}
    />
  );
}
