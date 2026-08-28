import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { dashboardUrl, getLiveVisitors } from "./api";

export default function LiveVisitors() {
  const live = useCachedPromise(getLiveVisitors, [], { keepPreviousData: true });
  const total = live.data?.reduce((sum, entry) => sum + entry.online, 0);

  return (
    <MenuBarExtra
      icon={Icon.Livestream}
      title={total != null ? String(total) : undefined}
      tooltip="Kobbe live visitors"
      isLoading={live.isLoading}
    >
      <MenuBarExtra.Section title="Online now">
        {live.data?.length ? (
          live.data.map((entry) => (
            <MenuBarExtra.Item
              key={entry.site.id}
              title={entry.site.name}
              subtitle={`${entry.online} online`}
              onAction={() => open(dashboardUrl(entry.site.id, "today"))}
            />
          ))
        ) : (
          <MenuBarExtra.Item title={live.isLoading ? "Loading..." : "No sites found"} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => live.revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
