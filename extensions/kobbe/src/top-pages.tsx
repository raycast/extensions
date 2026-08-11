import { Action, ActionPanel, Icon } from "@raycast/api";

import { getKobbePreferences } from "./preferences";
import { SitesPicker, TopPagesList } from "./views";

export default function TopPages() {
  const range = getKobbePreferences().defaultRange;

  return (
    <SitesPicker
      title="Kobbe Top Pages"
      searchBarPlaceholder="Choose a site..."
      renderActions={(site, revalidate) => (
        <ActionPanel>
          <Action.Push title="View Top Pages" icon={Icon.List} target={<TopPagesList site={site} range={range} />} />
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
