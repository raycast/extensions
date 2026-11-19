import {
  Cache,
  Color,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useForecasts } from "./hooks/useForecasts";
import { useResorts } from "./hooks/useResorts";
import { windNow, type ResortForecast } from "./lib/forecast";
import { formatSnow } from "./lib/units";

// Slightly under the 30m command interval, so each background run actually refetches.
const MAX_AGE_MS = 25 * 60 * 1000;

// Synchronous, so a hidden menu bar can return null immediately. Running the command from Raycast un-hides it.
const settings = new Cache({ namespace: "menu-bar" });
if (environment.launchType === LaunchType.UserInitiated) settings.remove("hidden");

// "Whistler Blackcomb" → "Whistler", "St. Anton/St. Christoph" → "St. Anton".
function shortName(name: string): string {
  const words = name.split(/[\s/,(]+/).filter(Boolean);
  return words[0].length < 4 && words[1] ? `${words[0]} ${words[1]}` : words[0];
}

// The menu bar shows the summit (or the single point), never an average.
const headline = (f?: ResortForecast) => (f?.kind === "split" ? f.summit : f?.point);
const compact = (cm: number | null | undefined) => formatSnow(cm).replace(" ", "");

export default function SnowMenuBar() {
  const [hidden, setHidden] = useState(() => settings.get("hidden") === "true");
  const { favorites, isLoading: resortsLoading } = useResorts();
  const { forecasts, isLoading } = useForecasts(hidden ? [] : favorites, MAX_AGE_MS);
  if (hidden) return null;

  const hide = async () => {
    settings.set("hidden", "true");
    setHidden(true);
    await showHUD("Hidden from the menu bar. Run Favorites in Menu Bar to show it again.");
  };
  const first = favorites[0];
  const openReport = async (resortId?: string) => {
    try {
      await launchCommand({ name: "snow-report", type: LaunchType.UserInitiated, context: { resortId } });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open Search Resorts" });
    }
  };

  const title = first ? `${compact(headline(forecasts[first.id])?.next24h)} ${shortName(first.name)}` : undefined;

  return (
    <MenuBarExtra
      icon={Icon.Snowflake}
      title={title}
      tooltip="Summit snowfall, next 24h"
      isLoading={resortsLoading || isLoading}
    >
      {favorites.length === 0 ? (
        <MenuBarExtra.Item title="Add favorites in Search Resorts" onAction={() => openReport()} />
      ) : (
        <MenuBarExtra.Section title="Summit snowfall · next 24h / 72h">
          {favorites.map((resort) => {
            const p = headline(forecasts[resort.id]);
            return (
              <MenuBarExtra.Item
                key={resort.id}
                title={resort.name}
                subtitle={p ? `${formatSnow(p.next24h)} / ${formatSnow(p.next72h)}` : "…"}
                icon={p && windNow(p) === "high" ? { source: Icon.Wind, tintColor: Color.Red } : undefined}
                tooltip={p && windNow(p) === "high" ? "High wind on the summit" : undefined}
                onAction={() => openReport(resort.id)}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Search Resorts" icon={Icon.List} onAction={() => openReport()} />
        <MenuBarExtra.Item title="Hide from Menu Bar" icon={Icon.EyeDisabled} onAction={hide} />
        <MenuBarExtra.Item title="Turn Off in Settings…" icon={Icon.Gear} onAction={openCommandPreferences} />
        <MenuBarExtra.Item title="Weather data by Open-Meteo.com" onAction={() => open("https://open-meteo.com/")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
