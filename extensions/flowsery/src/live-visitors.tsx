import { Icon, LaunchType, launchCommand, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api } from "./lib/api";
import { dashboardUrl, formatCount, websiteKey, websiteName } from "./lib/format";
import { loadLiveCounts } from "./lib/report";
import { Website } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

export default function Command() {
  const { data: websites, isLoading: isLoadingWebsites, error } = useWebsites();
  const { data: liveCounts, isLoading: isLoadingCounts } = useCachedPromise(
    (loadedWebsites: Website[]) => loadLiveCounts(api(), loadedWebsites),
    [websites ?? []],
    { execute: Boolean(websites?.length) },
  );
  const total = Object.values(liveCounts ?? {}).reduce((sum, count) => sum + count, 0);
  const tracked = websites?.filter((website) => liveCounts?.[websiteKey(website)] !== undefined) ?? [];

  return (
    <MenuBarExtra
      icon={Icon.TwoPeople}
      title={liveCounts ? formatCount(total) : undefined}
      tooltip="Flowsery Live Visitors"
      isLoading={isLoadingWebsites || isLoadingCounts}
    >
      {error && (
        <MenuBarExtra.Item title="Could Not Reach Flowsery" subtitle={error.message} icon={Icon.ExclamationMark} />
      )}
      <MenuBarExtra.Section title="Live Visitors">
        {tracked.map((website) => (
          <MenuBarExtra.Item
            key={websiteKey(website)}
            title={websiteName(website)}
            subtitle={formatCount(liveCounts?.[websiteKey(website)] ?? 0)}
            onAction={() => open(dashboardUrl(website))}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Analytics"
          icon={Icon.BarChart}
          onAction={() => launchCommand({ name: "view-analytics", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
