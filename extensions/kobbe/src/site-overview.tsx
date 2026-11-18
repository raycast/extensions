import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

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
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      )}
    />
  );
}
