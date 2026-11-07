import { Color, Icon, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dashboardUrl } from "./api";
import { formatNumber } from "./format";
import { getClient } from "./preferences";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(async () => getClient().sitesWithStats(), []);
  const sites = [...(data ?? [])].sort((a, b) => (b.stats.live ?? 0) - (a.stats.live ?? 0));
  const total = sites.reduce((sum, s) => sum + (s.stats.live ?? 0), 0);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "extension-icon.png" }}
      title={error ? "!" : data ? formatNumber(total) : undefined}
      tooltip="Live visitors on your sites"
    >
      {error ? (
        <MenuBarExtra.Section title="Could not load your sites">
          <MenuBarExtra.Item title={error.message} />
          <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title={`${formatNumber(total)} visitors right now`}>
          {sites.map((s) => (
            <MenuBarExtra.Item
              key={s.id}
              title={s.name || s.domain}
              subtitle={`${formatNumber(s.stats.live ?? 0)} live`}
              icon={{
                source: Icon.CircleFilled,
                tintColor: (s.stats.live ?? 0) > 0 ? Color.Green : Color.SecondaryText,
              }}
              onAction={() => open(dashboardUrl(s.id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Privatus Analytics" icon={Icon.Globe} onAction={() => open(dashboardUrl())} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
