import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

import { getKobbePreferences } from "./preferences";
import { SitesPicker, SourcesList } from "./views";

export default function TopSources() {
  const range = getKobbePreferences().defaultRange;

  return (
    <SitesPicker
      title="Kobbe Top Sources"
      searchBarPlaceholder="Choose a site..."
      renderActions={(site, revalidate) => (
        <ActionPanel>
          <Action.Push title="View Sources" icon={Icon.Globe} target={<SourcesList site={site} range={range} />} />
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
