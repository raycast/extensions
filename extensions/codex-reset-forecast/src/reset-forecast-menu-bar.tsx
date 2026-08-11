import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  MenuBarExtra,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { WEBSITE_URL } from "./components/forecast-actions";
import { forecastIconAsset } from "./domain/forecast-icon";
import { forecastTooltip, formatPercentage, formatRelativeTime, menuBarTitle } from "./domain/format-forecast";
import { useForecast } from "./hooks/use-forecast";
import { initializeMenuBarVisibility } from "./menu-bar-visibility-store";

const EMPTY_FORECAST_ICON = { source: forecastIconAsset(0), tintColor: Color.PrimaryText };

export default function Command() {
  const [isVisible, setIsVisible] = useState<boolean>();

  useEffect(() => {
    void initializeMenuBarVisibility()
      .then(setIsVisible)
      .catch(() => setIsVisible(true));
  }, []);

  if (isVisible === undefined) return <MenuBarExtra icon={EMPTY_FORECAST_ICON} title="—" isLoading />;
  if (!isVisible) return null;

  return <ForecastMenuBar />;
}

function ForecastMenuBar() {
  const preferences = getPreferenceValues<Preferences.ResetForecastMenuBar>();
  const menuBarDisplay = preferences.menuBarDisplay ?? "likelihood";
  const { data, error, isLoading, revalidate } = useForecast();
  const response = data?.response;
  const title = response ? menuBarTitle(response, menuBarDisplay) : "—";
  const icon =
    menuBarDisplay === "last-reset"
      ? Icon.ArrowClockwise
      : { source: forecastIconAsset(response?.forecast.score ?? 0), tintColor: Color.PrimaryText };
  const tooltip = response
    ? `${forecastTooltip(response)}${data.isStale ? " — cached data" : ""}`
    : `Forecast unavailable${error?.message ? ` — ${error.message}` : ""}`;

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      {response ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Reset Likelihood" subtitle={formatPercentage(response.forecast.score)} />
          <MenuBarExtra.Item
            title="Last Confirmed Reset"
            subtitle={formatRelativeTime(response.forecast.latestResetAt)}
          />
          <MenuBarExtra.Item
            title={data.isStale ? "Updated (Cached)" : "Updated"}
            subtitle={formatRelativeTime(data.lastSuccessfulRequestAt)}
            icon={data.isStale ? Icon.Warning : undefined}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Forecast Unavailable">
          <MenuBarExtra.Item title={error?.message ?? "No cached forecast is available"} icon={Icon.Warning} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Forecast History"
          icon={Icon.List}
          onAction={() => {
            void launchCommand({ name: "check-reset-forecast", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Open Source Website"
          icon={Icon.Globe}
          onAction={() => {
            void open(WEBSITE_URL);
          }}
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => {
            void revalidate();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
