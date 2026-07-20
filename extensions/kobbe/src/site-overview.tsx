import { Action, ActionPanel, Icon } from "@raycast/api";

import { getKobbePreferences } from "./preferences";
import { SiteOverviewDetail, SitesPicker } from "./views";

export default function SiteOverview() {
  const range = getKobbePreferences().defaultRange;

  return (
    <SitesPicker
      title="Kobbe Site Overview"
      searchBarPlaceholder="Choose a site..."
      renderActions={(site, revalidate) => (
        <ActionPanel>
          <Action.Push
            title="View Overview"
            icon={Icon.BarChart}
            target={<SiteOverviewDetail site={site} range={range} />}
          />
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
