import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { dashboardUrl, getLiveVisitors } from "./api";

export default function LiveVisitors() {
  const live = useCachedPromise(getLiveVisitors, [], { keepPreviousData: true });
  const loadedCounts = live.data?.filter((entry) => entry.online != null);
  const total = loadedCounts?.length ? loadedCounts.reduce((sum, entry) => sum + (entry.online ?? 0), 0) : undefined;
  const hasPartialFailures = live.data?.some((entry) => entry.online == null) ?? false;

  return (
    <MenuBarExtra
      icon={Icon.Livestream}
      title={!live.error && total != null ? `${total}${hasPartialFailures ? "+" : ""}` : undefined}
      tooltip="Kobbe live visitors"
      isLoading={live.isLoading}
    >
      {live.error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title="Could not load Kobbe sites"
            subtitle={live.error.message}
            onAction={() => live.revalidate()}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Online now">
          {live.data?.length ? (
            live.data.map((entry) => (
              <MenuBarExtra.Item
                key={entry.site.id}
                title={entry.site.name}
                subtitle={entry.online != null ? `${entry.online} online` : "Could not load"}
                onAction={() => open(dashboardUrl(entry.site.id, "today"))}
              />
            ))
          ) : (
            <MenuBarExtra.Item title={live.isLoading ? "Loading..." : "No sites found"} />
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => live.revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
