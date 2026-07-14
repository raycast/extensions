import { Action, ActionPanel, Icon } from "@raycast/api";

import { getKobbePreferences } from "./preferences";
import { RevenueDetail, SitesPicker } from "./views";

export default function Revenue() {
  const range = getKobbePreferences().defaultRange;

  return (
    <SitesPicker
      title="Kobbe Revenue"
      searchBarPlaceholder="Choose a site..."
      renderActions={(site, revalidate) => (
        <ActionPanel>
          <Action.Push title="View Revenue" icon={Icon.Coins} target={<RevenueDetail site={site} range={range} />} />
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
