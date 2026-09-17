import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { WEBSITE_URL } from "./components/forecast-actions";
import { forecastIconAsset } from "./domain/forecast-icon";
import {
  forecastTooltip,
  formatDateTime,
  formatPercentage,
  formatRelativeTime,
  menuBarTitle,
} from "./domain/format-forecast";
import { latestReset, recordLabel, resetHistory, safeSourceUrl } from "./domain/reset-history";
import { useForecast } from "./hooks/use-forecast";
import { initializeMenuBarVisibility, setMenuBarVisibility } from "./menu-bar-visibility-store";

export default function Command() {
  const [isVisible, setIsVisible] = useState<boolean>();
  useEffect(() => {
    void initializeMenuBarVisibility(environment.launchType)
      .then(setIsVisible)
      .catch(() => setIsVisible(true));
  }, []);
  if (isVisible === undefined) return <MenuBarExtra icon={Icon.Gauge} title="—" isLoading />;
  const hide = async () => {
    try {
      await setMenuBarVisibility(false);
      setIsVisible(false);
      await showHUD("Reset forecast hidden from menu bar");
    } catch {
      await showHUD("Could not hide the reset forecast");
    }
  };
  return isVisible ? <ForecastMenuBar onHide={hide} /> : null;
}

function ForecastMenuBar({ onHide }: { onHide: () => void }) {
  const { menuBarDisplay = "likelihood-24h" } = getPreferenceValues<Preferences.ToggleResetForecastMenuBar>();
  const { data, error, isLoading, revalidate, warning } = useForecast();
  const response = data?.response;
  const reset = response ? latestReset(response) : undefined;
  const icon =
    menuBarDisplay === "last-reset"
      ? Icon.ArrowClockwise
      : {
          source: forecastIconAsset(
            (menuBarDisplay === "likelihood-48h" ? response?.forecast?.score48h : response?.forecast?.score24h) ?? 0,
          ),
          tintColor: Color.PrimaryText,
        };
  const openHistory = () => launchCommand({ name: "check-reset-forecast", type: LaunchType.UserInitiated });

  return (
    <MenuBarExtra
      icon={icon}
      title={response ? menuBarTitle(response, menuBarDisplay) : "—"}
      tooltip={
        response ? `${forecastTooltip(response)}${warning ? ` ${warning}` : ""}` : "Codex Reset Monitor unavailable"
      }
      isLoading={isLoading}
    >
      {response ? (
        <>
          <MenuBarExtra.Section title="Reset Likelihood">
            <MenuBarExtra.Item
              title="Within 24 Hours"
              subtitle={formatPercentage(response.forecast?.score24h)}
              icon={Icon.Clock}
              onAction={openHistory}
            />
            <MenuBarExtra.Item
              title="Within 48 Hours"
              subtitle={formatPercentage(response.forecast?.score48h)}
              icon={Icon.Clock}
              onAction={openHistory}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Last Confirmed Reset">
            <MenuBarExtra.Item
              title={
                reset
                  ? formatRelativeTime(reset.dateTime).replace(/^./, (letter) => letter.toUpperCase())
                  : "No Reset Recorded"
              }
              subtitle={reset ? formatDateTime(reset.dateTime) : undefined}
              onAction={
                reset && safeSourceUrl(reset.sourceUrl) ? () => open(safeSourceUrl(reset.sourceUrl)!) : undefined
              }
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Recent Reset Records">
            {resetHistory(response, "resets")
              .slice(0, 4)
              .map((record) => {
                const source = safeSourceUrl(record.sourceUrl);
                return (
                  <MenuBarExtra.Item
                    key={record.id}
                    title={formatDateTime(record.dateTime)}
                    subtitle={recordLabel(record)}
                    onAction={source ? () => open(source) : openHistory}
                  />
                );
              })}
            <MenuBarExtra.Item title="View Outlook and Full History" icon={Icon.List} onAction={openHistory} />
            <MenuBarExtra.Item
              title="View Reset Calendar"
              icon={Icon.Calendar}
              onAction={() => launchCommand({ name: "reset-history-calendar", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            {warning ? <MenuBarExtra.Item title={warning} icon={Icon.Warning} /> : null}
            <MenuBarExtra.Item title="Forecast Updated" subtitle={formatRelativeTime(response.updatedAt)} />
            <MenuBarExtra.Item title="Last Checked" subtitle={formatRelativeTime(data.lastSuccessfulRequestAt)} />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Section title={isLoading ? "Loading Reset Monitor" : "Reset Monitor Unavailable"}>
          <MenuBarExtra.Item title={error?.message ?? "Fetching the latest forecast…"} icon={Icon.Clock} />
          <MenuBarExtra.Item title="View Outlook and Full History" icon={Icon.List} onAction={openHistory} />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => {
            void revalidate();
          }}
        />
        <MenuBarExtra.Item title="Menu Bar Settings…" icon={Icon.Gear} onAction={openCommandPreferences} />
        <MenuBarExtra.Item title="Hide from Menu Bar" icon={Icon.EyeDisabled} onAction={onHide} />
        <MenuBarExtra.Item title="Open Codex Reset Monitor" icon={Icon.Globe} onAction={() => open(WEBSITE_URL)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
