import React, { useCallback, useEffect, useState } from "react";
import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import {
  formatRelativeTime,
  formatTimeUntil,
  truncate,
} from "./lib/formatters";
import {
  buildMenuBarTitle,
  buildPulseSubtitle,
  getPulseModeLabel,
} from "./lib/menu-bar-insights";
import { openCommand } from "./lib/navigation";
import { readMenuBarSnapshot, syncMenuBarSnapshot } from "./lib/queries";
import { getPulseModePreference } from "./lib/settings";
import { MenuBarSnapshot } from "./lib/types";

export default function MenuBar() {
  const [snapshot, setSnapshot] = useState<MenuBarSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async (force = false) => {
    const cached = await readMenuBarSnapshot();
    setSnapshot(cached);

    try {
      const synced = await syncMenuBarSnapshot({ force });
      setSnapshot(synced);
      setError(synced.syncError);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to refresh Noesis pulse",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = snapshot?.dashboard ?? null;
  const insights = snapshot?.insights ?? {};
  const pulseMode = getPulseModePreference();
  const title = dashboard
    ? buildMenuBarTitle(dashboard, insights, pulseMode, error)
    : "Pulse";
  const pulseSubtitle = buildPulseSubtitle(insights);

  return (
    <MenuBarExtra icon="icon.png" title={title}>
      {!snapshot ? <MenuBarExtra.Item title="Loading Noesis pulse..." /> : null}

      {dashboard &&
      !dashboard.hasCredentials &&
      dashboard.source === "empty" ? (
        <>
          <MenuBarExtra.Item
            title="Connect Selemene Engine API Key"
            icon={Icon.Key}
            onAction={() => openCommand("api-key")}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {insights.vedicClock ? (
        <>
          <MenuBarExtra.Item
            title={formatMenuBarLine("Organ", insights.vedicClock.title)}
            icon={Icon.Clock}
          />
          {insights.vedicClock.subtitle ? (
            <MenuBarExtra.Item
              title={formatMenuBarLine("Window", insights.vedicClock.subtitle)}
            />
          ) : null}
          <MenuBarExtra.Item
            title={formatMenuBarLine("Focus", insights.vedicClock.summary, 72)}
          />
          <MenuBarExtra.Item
            title={formatMenuBarLine(
              "Next Refresh",
              formatTimeUntil(insights.vedicClock.refreshAfter),
              36,
            )}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {insights.biorhythm ? (
        <>
          <MenuBarExtra.Item
            title={formatMenuBarLine("Biorhythm", insights.biorhythm.title)}
            icon={Icon.Heartbeat}
          />
          {insights.biorhythm.subtitle ? (
            <MenuBarExtra.Item
              title={formatMenuBarLine(
                "Dominant",
                insights.biorhythm.subtitle,
                68,
              )}
            />
          ) : null}
          <MenuBarExtra.Item
            title={formatMenuBarLine("Cycles", insights.biorhythm.summary, 72)}
          />
          <MenuBarExtra.Item
            title={formatMenuBarLine(
              "Cached",
              formatRelativeTime(insights.biorhythm.fetchedAt),
              32,
            )}
          />
          <MenuBarExtra.Separator />
        </>
      ) : dashboard?.profile?.birthDate ? null : dashboard ? (
        <>
          <MenuBarExtra.Item
            title={formatMenuBarLine(
              "Profile",
              "Add birth data for personal pulse",
              56,
            )}
            icon={Icon.PersonCircle}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {insights.vimshottari ? (
        <>
          <MenuBarExtra.Item
            title={formatMenuBarLine("Vimshottari", insights.vimshottari.title)}
            icon={Icon.Stars}
          />
          {insights.vimshottari.subtitle ? (
            <MenuBarExtra.Item
              title={formatMenuBarLine(
                "Next",
                insights.vimshottari.subtitle,
                68,
              )}
            />
          ) : null}
          <MenuBarExtra.Item
            title={formatMenuBarLine("Dasha", insights.vimshottari.summary, 72)}
          />
          <MenuBarExtra.Item
            title={formatMenuBarLine(
              "Cached",
              formatRelativeTime(insights.vimshottari.fetchedAt),
              32,
            )}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {dashboard ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine(
            "Cache",
            dashboard.cacheState.toUpperCase(),
            28,
          )}
          icon={Icon.Circle}
        />
      ) : null}
      <MenuBarExtra.Item
        title={formatMenuBarLine("Mode", getPulseModeLabel(pulseMode), 36)}
        icon={Icon.Text}
      />
      {dashboard?.syncError ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Snapshot", dashboard.syncError, 72)}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {error ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Pulse", error, 72)}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {pulseSubtitle ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine("Board", pulseSubtitle, 72)}
          icon={Icon.AlignLeft}
        />
      ) : null}
      {dashboard?.timestamps.lastSyncAt ? (
        <MenuBarExtra.Item
          title={formatMenuBarLine(
            "Last Sync",
            formatRelativeTime(dashboard.timestamps.lastSyncAt),
            36,
          )}
        />
      ) : null}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon={Icon.AppWindow}
        onAction={() => openCommand("dashboard")}
      />
      <MenuBarExtra.Item
        title="Open Engines"
        icon={Icon.Gauge}
        onAction={() => openCommand("engines")}
      />
      <MenuBarExtra.Item
        title="Open Workflows"
        icon={Icon.Network}
        onAction={() => openCommand("workflows")}
      />
      <MenuBarExtra.Item
        title="Edit Profile"
        icon={Icon.Pencil}
        onAction={() => openCommand("profile")}
      />
      <MenuBarExtra.Item
        title="Edit Access Key"
        icon={Icon.Key}
        onAction={() => openCommand("api-key")}
      />
      <MenuBarExtra.Item
        title="Refresh Pulse Now"
        icon={Icon.ArrowClockwise}
        onAction={() => void load(true)}
      />
      <MenuBarExtra.Item
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra>
  );
}

function formatMenuBarLine(
  label: string,
  value: string,
  maxLength = 60,
): string {
  const prefix = `${label} · `;
  return `${prefix}${truncate(value, Math.max(12, maxLength - prefix.length))}`;
}
