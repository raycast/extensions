import {
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showHUD,
  type LaunchProps,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { useEffect } from "react";
import { BRIDGE_SCRIPT } from "./lib/bridge";
import { CONNECT_COMMAND, MENU_BAR_COMMAND, useUsage } from "./lib/use-usage";
import { USAGE_PAGE } from "./lib/usage-api";
import { deriveView, errorBanner, type Banner, type Row } from "./lib/view";

type LaunchContext = { force?: boolean };

const BANNER_ICONS: Record<Banner["kind"], Icon> = {
  error: Icon.Warning,
  paused: Icon.Pause,
  stale: Icon.Clock,
  locked: Icon.XMarkCircle,
};

function UsageRow({ row }: { row: Row }) {
  return (
    <MenuBarExtra.Item
      icon={{ source: row.icon }}
      title={row.title}
      subtitle={row.subtitle}
      onAction={() => open(USAGE_PAGE)}
    />
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: LaunchContext }>) {
  const force = launchContext?.force === true;
  const { snap, prefs, isLoading } = useUsage({ force });

  useEffect(() => {
    if (force && !isLoading && snap.lastError) {
      showHUD(errorBanner(snap.lastError.kind, snap.backoffUntil, prefs.credentialsSource));
    }
  }, [isLoading]);

  const view = deriveView(snap, prefs, Date.now());
  const bridgeInstalled = existsSync(BRIDGE_SCRIPT);

  return (
    <MenuBarExtra icon={{ source: view.icon }} title={view.title} tooltip={view.tooltip} isLoading={isLoading}>
      {view.banners.length > 0 && (
        <MenuBarExtra.Section>
          {view.banners.map((banner) => (
            <MenuBarExtra.Item key={banner.text} icon={BANNER_ICONS[banner.kind]} title={banner.text} />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {view.rows.map((row) => (
          <UsageRow key={row.key} row={row} />
        ))}
      </MenuBarExtra.Section>

      {view.extraRows.length > 0 && (
        <MenuBarExtra.Section>
          {view.extraRows.map((row) => (
            <UsageRow key={row.key} row={row} />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {view.planLabel && <MenuBarExtra.Item title={view.planLabel} />}
        <MenuBarExtra.Item title={view.updatedLabel} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() =>
            launchCommand({
              name: MENU_BAR_COMMAND,
              type: LaunchType.UserInitiated,
              context: { force: true } satisfies LaunchContext,
            })
          }
        />
        <MenuBarExtra.Item title="Open Usage Page" icon={Icon.Globe} onAction={() => open(USAGE_PAGE)} />
        {!bridgeInstalled && (
          <MenuBarExtra.Item
            title="Connect Claude Code…"
            icon={Icon.Plug}
            onAction={() => launchCommand({ name: CONNECT_COMMAND, type: LaunchType.UserInitiated })}
          />
        )}
        <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
