import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, openCommandPreferences, showHUD } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import React from "react";
import { provider, getToken, fetchEnergySites, fetchLiveStatus } from "./tesla";
import { formatPower } from "./utils/energyCalc";
import { COLORS, ICONS } from "./utils/theme";

function batteryTitle(batteryPower: number): string {
  if (batteryPower > 50) return `Discharging: ${formatPower(batteryPower)}`;
  if (batteryPower < -50) return `Charging: ${formatPower(Math.abs(batteryPower))}`;
  return "Standby";
}

function gridTitle(gridPower: number): string {
  if (gridPower > 50) return `Importing: ${formatPower(gridPower)}`;
  if (gridPower < -50) return `Exporting: ${formatPower(Math.abs(gridPower))}`;
  return "Idle";
}

function Command() {
  const token = getToken();

  const {
    data: status,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (t: string) => {
      const sites = await fetchEnergySites(t);
      if (sites.length === 0) return null;
      return fetchLiveStatus(t, sites[0].energy_site_id);
    },
    [token],
    { keepPreviousData: true },
  );

  const solarPower = status?.solar_power ?? 0;
  const isProducing = solarPower > 50;
  const title = isProducing ? formatPower(solarPower) : "—";
  const icon = isProducing
    ? { source: ICONS.solar, tintColor: COLORS.solar.tint }
    : { source: Icon.Moon, tintColor: Color.SecondaryText };

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      {status && (
        <>
          <MenuBarExtra.Section title="Solar">
            <MenuBarExtra.Item
              icon={{ source: ICONS.solar, tintColor: COLORS.solar.tint }}
              title={`Production: ${formatPower(status.solar_power)}`}
              onAction={() => {}}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Powerwall">
            <MenuBarExtra.Item
              icon={{
                source: ICONS.battery,
                tintColor: status.percentage_charged > 20 ? COLORS.batteryPos.tint : Color.Red,
              }}
              title={`Charge: ${Math.round(status.percentage_charged)}%`}
              onAction={() => {}}
            />
            <MenuBarExtra.Item
              icon={{
                source: status.battery_power < -50 ? ICONS.charging : ICONS.battery,
                tintColor:
                  status.battery_power > 50
                    ? COLORS.batteryPos.tint
                    : status.battery_power < -50
                      ? COLORS.batteryNeg.tint
                      : Color.SecondaryText,
              }}
              title={batteryTitle(status.battery_power)}
              onAction={() => {}}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Grid">
            <MenuBarExtra.Item
              icon={{
                source: ICONS.grid,
                tintColor:
                  status.grid_power > 50
                    ? COLORS.gridPos.tint
                    : status.grid_power < -50
                      ? COLORS.gridNeg.tint
                      : Color.SecondaryText,
              }}
              title={gridTitle(status.grid_power)}
              onAction={() => {}}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Home">
            <MenuBarExtra.Item
              icon={{ source: ICONS.home, tintColor: COLORS.home.tint }}
              title={`Consumption: ${formatPower(status.load_power)}`}
              onAction={() => {}}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                await revalidate();
                await showHUD("Solar status refreshed");
              }}
            />
            <MenuBarExtra.Item title="Configure" icon={Icon.Gear} onAction={openCommandPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}

function AuthErrorFallback() {
  return (
    <MenuBarExtra icon={{ source: ICONS.solar, tintColor: Color.SecondaryText }} title="!">
      <MenuBarExtra.Item title="Sign-in Required" icon={Icon.ExclamationMark} onAction={() => {}} />
      <MenuBarExtra.Item
        title="Open Solar Production to Sign In"
        icon={Icon.ArrowRight}
        onAction={async () => {
          await launchCommand({ name: "view-solar-production", type: LaunchType.UserInitiated });
        }}
      />
      <MenuBarExtra.Item title="Configure" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}

class OAuthErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    // Only catch OAuth background-launch errors; re-throw everything else
    if (error?.message?.includes("OAuth") || error?.message?.includes("background")) {
      return { hasError: true };
    }
    throw error;
  }

  render() {
    if (this.state.hasError) return <AuthErrorFallback />;
    return this.props.children;
  }
}

const WrappedCommand = withAccessToken(provider)(Command);

export default function MenuBarCommand() {
  return (
    <OAuthErrorBoundary>
      <WrappedCommand />
    </OAuthErrorBoundary>
  );
}
