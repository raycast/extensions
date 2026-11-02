import { Icon, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { CONNECT_COMMAND, USAGE_PAGE } from "./lib/constants";
import { openCommand, useUsage } from "./lib/use-usage";
import { deriveView, type Banner } from "./lib/view";

const BANNER_ICONS: Record<Banner["kind"], Icon> = {
  setup: Icon.Plug,
  limit: Icon.XMarkCircle,
};

export default function Command() {
  const { state, prefs, isLoading } = useUsage();
  const view = deriveView(state, prefs, Date.now());

  return (
    <MenuBarExtra icon={{ source: view.icon }} title={view.title} tooltip={view.tooltip} isLoading={isLoading}>
      {view.banners.length > 0 && (
        <MenuBarExtra.Section>
          {view.banners.map((banner) => (
            <MenuBarExtra.Item
              key={banner.text}
              icon={BANNER_ICONS[banner.kind]}
              title={banner.text}
              onAction={banner.kind === "setup" ? () => openCommand(CONNECT_COMMAND) : undefined}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {view.rows.map((row) => (
          <MenuBarExtra.Item
            key={row.key}
            icon={{ source: row.icon }}
            title={row.title}
            subtitle={row.subtitle}
            onAction={() => open(USAGE_PAGE)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={view.updatedLabel} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Usage Page" icon={Icon.Globe} onAction={() => open(USAGE_PAGE)} />
        {!state.connected && (
          <MenuBarExtra.Item
            title="Connect Claude Code…"
            icon={Icon.Plug}
            onAction={() => openCommand(CONNECT_COMMAND)}
          />
        )}
        <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
