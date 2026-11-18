import { Icon, LaunchType, launchCommand, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { api } from "./lib/api";
import { dashboardUrl, formatCount, websiteKey, websiteName } from "./lib/format";
import { LiveCounts, loadLiveCounts } from "./lib/report";
import { Website } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

async function openAnalytics() {
  try {
    await launchCommand({ name: "view-analytics", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open View Analytics" });
  }
}

function menuBarTitle(liveCounts: LiveCounts | undefined): string | undefined {
  const counts = Object.values(liveCounts?.counts ?? {});
  if (!liveCounts || counts.length === 0) return undefined;
  const total = counts.reduce((sum, count) => sum + count, 0);
  const isPartial = liveCounts.unavailable.length > 0 || liveCounts.omitted > 0;
  return `${formatCount(total)}${isPartial ? "+" : ""}`;
}

export default function Command() {
  const { data: websites, isLoading: isLoadingWebsites, error } = useWebsites();
  const {
    data: liveCounts,
    isLoading: isLoadingCounts,
    error: countsError,
  } = useCachedPromise((loadedWebsites: Website[]) => loadLiveCounts(api(), loadedWebsites), [websites ?? []], {
    execute: Boolean(websites?.length),
  });
  const loadError = error ?? countsError;
  const shownWebsites = websites?.slice(0, (websites.length ?? 0) - (liveCounts?.omitted ?? 0)) ?? [];

  return (
    <MenuBarExtra
      icon={Icon.TwoPeople}
      title={menuBarTitle(liveCounts)}
      tooltip="Flowsery Live Visitors"
      isLoading={isLoadingWebsites || isLoadingCounts}
    >
      {loadError && (
        <MenuBarExtra.Item title="Could Not Reach Flowsery" subtitle={loadError.message} icon={Icon.ExclamationMark} />
      )}
      {liveCounts && (
        <MenuBarExtra.Section title="Live Visitors">
          {shownWebsites.map((website) => {
            const count = liveCounts.counts[websiteKey(website)];
            return (
              <MenuBarExtra.Item
                key={websiteKey(website)}
                title={websiteName(website)}
                subtitle={count === undefined ? "Unavailable" : formatCount(count)}
                onAction={() => open(dashboardUrl(website))}
              />
            );
          })}
          {liveCounts.omitted > 0 && <MenuBarExtra.Item title={`${liveCounts.omitted} More Not Counted`} />}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="View Analytics" icon={Icon.BarChart} onAction={openAnalytics} />
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
