import {
  environment,
  getPreferenceValues,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { refresh } from "./lib/refresh";
import { oauthSource } from "./lib/usage-api";
import { readSnapshot, writeSnapshot } from "./lib/usage-store";
import { deriveView, errorBanner, type Row } from "./lib/view";
import type { Prefs, Snapshot } from "./types";

const USAGE_PAGE = "https://claude.ai/settings/usage";

type LaunchContext = { force?: boolean };

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
  const prefs = getPreferenceValues<Prefs>();
  const [snap, setSnap] = useState<Snapshot>(readSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const force = launchContext?.force === true;
    const userInitiated = environment.launchType === LaunchType.UserInitiated;

    (async () => {
      const next = await refresh(snap, oauthSource(prefs.credentialsSource), { force, userInitiated });
      if (next === snap) return;
      writeSnapshot(next);
      setSnap(next);
      if (force && next.lastError) {
        await showHUD(errorBanner(next.lastError.kind, next.backoffUntil, prefs.credentialsSource));
      }
    })()
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const view = deriveView(snap, prefs, Date.now());

  return (
    <MenuBarExtra icon={{ source: view.icon }} title={view.title} tooltip={view.tooltip} isLoading={isLoading}>
      {view.banners.length > 0 && (
        <MenuBarExtra.Section>
          {view.banners.map((banner) => (
            <MenuBarExtra.Item key={banner} title={banner} />
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
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() =>
            launchCommand({
              name: "usage-menu-bar",
              type: LaunchType.UserInitiated,
              context: { force: true } satisfies LaunchContext,
            })
          }
        />
        <MenuBarExtra.Item title="Open Usage on claude.ai" onAction={() => open(USAGE_PAGE)} />
        <MenuBarExtra.Item title="Preferences…" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
