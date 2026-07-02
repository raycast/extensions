import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { type AirPodsBattery, readAirPodsBattery } from "./bluetooth";
import { getCachedBattery, setCachedBattery } from "./cache";
import { isMenuBarVisible, setMenuBarVisible } from "./visibility";

type ViewState =
  | { status: "loading"; cachedBattery?: AirPodsBattery }
  | { status: "hidden" }
  | { status: "connected"; battery: AirPodsBattery; warnings: string[]; isCached: boolean }
  | { status: "not-connected"; message: string; cachedBattery?: AirPodsBattery }
  | { status: "error"; message: string; cachedBattery?: AirPodsBattery };

const AIRPODS_PRO_RIGHT_ICON = { source: "sf-airpods-pro-right.png", tintColor: Color.PrimaryText };

export default function Command() {
  const [state, setState] = useState<ViewState>(() => ({
    status: "loading",
    cachedBattery: getCachedBattery(),
  }));

  const loadBattery = useCallback(async (isMounted: () => boolean = () => true) => {
    const isVisible = await isMenuBarVisible();

    if (!isMounted()) {
      return;
    }

    if (!isVisible) {
      setState({ status: "hidden" });
      return;
    }

    setState((currentState) => ({
      status: "loading",
      cachedBattery: getDisplayedBattery(currentState) ?? getCachedBattery(),
    }));

    const result = await readAirPodsBattery();

    if (!isMounted()) {
      return;
    }

    if (result.status === "connected") {
      setCachedBattery(result.battery);
      setState({
        status: "connected",
        battery: result.battery,
        warnings: result.warnings,
        isCached: false,
      });
      return;
    }

    const cachedBattery = getCachedBattery();
    setState({ ...result, cachedBattery });
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadBattery(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, [loadBattery]);

  const displayedBattery = getDisplayedBattery(state);
  const title = displayedBattery ? formatMenuTitle(displayedBattery) : "--";
  const tooltip = formatTooltip(state);

  if (state.status === "hidden") {
    return null;
  }

  return (
    <MenuBarExtra
      icon={AIRPODS_PRO_RIGHT_ICON}
      isLoading={state.status === "loading" && !displayedBattery}
      title={title}
      tooltip={tooltip}
    >
      {renderMenuItems(
        state,
        () => loadBattery(),
        () => hideMenuBarItem(),
      )}
    </MenuBarExtra>
  );
}

async function hideMenuBarItem() {
  await setMenuBarVisible(false);
  await launchCommand({ name: "airpods-battery", type: LaunchType.Background });
}

function renderMenuItems(state: ViewState, onRefresh: () => void, onHideMenuBarItem: () => void) {
  const displayedBattery = getDisplayedBattery(state);

  if (!displayedBattery) {
    return (
      <>
        <MenuBarExtra.Item title={state.status === "loading" ? "Reading AirPods Battery" : "AirPods"} />
        <MenuBarExtra.Item
          icon={Icon.ExclamationMark}
          title={state.status === "not-connected" ? state.message : "Battery unavailable"}
          subtitle={state.status === "error" ? state.message : undefined}
        />
        <MenuBarExtra.Separator />
        <RefreshItem isLoading={state.status === "loading"} onRefresh={onRefresh} />
        <VisibilityToggleItem onHideMenuBarItem={onHideMenuBarItem} />
        <BluetoothSettingsItem />
      </>
    );
  }

  const isCached = state.status !== "connected" || state.isCached;
  const statusMessage = getStatusMessage(state);

  return (
    <>
      <MenuBarExtra.Item title={displayedBattery.name} subtitle={isCached ? "Last known reading" : "Connected"} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Left AirPod" subtitle={displayedBattery.left ?? "--"} />
      <MenuBarExtra.Item title="Right AirPod" subtitle={displayedBattery.right ?? "--"} />
      {displayedBattery.case ? (
        <MenuBarExtra.Item icon={Icon.BatteryCharging} title="Case" subtitle={displayedBattery.case} />
      ) : null}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item icon={Icon.Clock} title="Updated" subtitle={formatUpdatedAt(displayedBattery.updatedAt)} />
      {statusMessage ? <MenuBarExtra.Item icon={Icon.Info} title={statusMessage} /> : null}
      <MenuBarExtra.Separator />
      <RefreshItem isLoading={state.status === "loading"} onRefresh={onRefresh} />
      <VisibilityToggleItem onHideMenuBarItem={onHideMenuBarItem} />
      <BluetoothSettingsItem />
    </>
  );
}

function RefreshItem({ isLoading, onRefresh }: { isLoading: boolean; onRefresh: () => void }) {
  return (
    <MenuBarExtra.Item
      icon={Icon.ArrowClockwise}
      title={isLoading ? "Refreshing" : "Refresh Battery"}
      onAction={onRefresh}
    />
  );
}

function VisibilityToggleItem({ onHideMenuBarItem }: { onHideMenuBarItem: () => void }) {
  return <MenuBarExtra.Item icon={Icon.EyeDisabled} title="Hide Menu Bar Icon" onAction={onHideMenuBarItem} />;
}

function BluetoothSettingsItem() {
  return (
    <MenuBarExtra.Item
      icon={Icon.Gear}
      title="Open Bluetooth Settings"
      onAction={() => open("x-apple.systempreferences:com.apple.BluetoothSettings")}
    />
  );
}

function getDisplayedBattery(state: ViewState): AirPodsBattery | undefined {
  if (state.status === "connected") {
    return state.battery;
  }

  if (state.status === "hidden") {
    return undefined;
  }

  return state.cachedBattery;
}

function formatMenuTitle(battery: AirPodsBattery): string {
  return `${battery.left ?? "--"}  ${battery.right ?? "--"}`;
}

function formatTooltip(state: ViewState): string {
  const battery = getDisplayedBattery(state);

  if (!battery) {
    if (state.status === "loading") {
      return "Reading AirPods battery";
    }

    return state.status === "error" || state.status === "not-connected" ? state.message : "AirPods battery unavailable";
  }

  const parts = [
    battery.name,
    `Left ${battery.left ?? "--"}`,
    `Right ${battery.right ?? "--"}`,
    battery.case ? `Case ${battery.case}` : undefined,
    state.status === "connected" ? undefined : "Showing last known reading",
  ].filter(Boolean);

  return parts.join(" · ");
}

function getStatusMessage(state: ViewState): string | undefined {
  if (state.status === "connected" && state.warnings.length > 0) {
    return state.warnings.join(", ");
  }

  if (state.status === "not-connected" && state.cachedBattery) {
    return "AirPods not connected; showing last known reading";
  }

  if (state.status === "error" && state.cachedBattery) {
    return "Refresh failed; showing last known reading";
  }

  return undefined;
}

function formatUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
