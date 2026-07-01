import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  formatTime,
  formatDate,
  formatForCopy,
  formatAllForCopy,
} from "./formatter";
import { loadZones } from "./zones";
import type { Preferences, ZoneInfo, ZoneResult } from "./types";

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export default function WorldClock() {
  const prefs = getPreferenceValues<Preferences>();
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    setIsLoadingZones(true);

    loadZones(prefs.defaultZones)
      .then((loadedZones) => {
        if (!cancelled) setZones(loadedZones);
      })
      .catch(async (error: unknown) => {
        if (!cancelled) {
          await showToast(
            Toast.Style.Failure,
            "Could not load zones",
            errorMessage(error),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prefs.defaultZones]);

  const results: ZoneResult[] = zones.map((zone) => ({
    ...zone,
    time: formatTime(now, zone.timezone, prefs.timeFormat),
    date: formatDate(now, zone.timezone),
    isSource: false,
    isTarget: false,
  }));

  return (
    <List isLoading={isLoadingZones}>
      {results.length === 0 && !isLoadingZones ? (
        <List.EmptyView
          title="No zones configured"
          description="Set your default zones in extension preferences"
          icon={Icon.Globe}
        />
      ) : (
        results.map((zone, index) => (
          <List.Item
            key={`${zone.label}-${index}`}
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            title={zone.label}
            subtitle={zone.time}
            accessories={[{ text: zone.date }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Time"
                  content={formatForCopy(
                    now,
                    zone.timezone,
                    zone.label,
                    prefs.timeFormat,
                    prefs.copyFormat,
                  )}
                />
                <Action.CopyToClipboard
                  title="Copy All Times"
                  content={formatAllForCopy(
                    now,
                    zones,
                    prefs.timeFormat,
                    prefs.copyFormat,
                  )}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Open
                  title="Open in Timezoner"
                  target="timezoner://open"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
