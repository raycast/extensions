import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  helperVersion,
  loadState,
  openSetupInTerminal,
  playSound,
  signOut,
} from "./findmy";
import type { FindMyDevice, LoadState } from "./types";

function deviceIcon(device: FindMyDevice): Icon {
  const deviceType =
    `${device.deviceClass ?? ""} ${device.displayName ?? ""} ${device.deviceModel ?? ""}`.toLowerCase();
  if (deviceType.includes("watch")) return Icon.Clock;
  if (deviceType.includes("mac") || deviceType.includes("computer"))
    return Icon.Desktop;
  if (deviceType.includes("airpod") || deviceType.includes("headphone"))
    return Icon.Headphones;
  if (deviceType.includes("ipad") || deviceType.includes("tablet"))
    return Icon.AppWindow;
  return Icon.Mobile;
}

function batteryAccessory(
  device: FindMyDevice,
): List.Item.Accessory | undefined {
  if (typeof device.batteryLevel !== "number" || device.batteryLevel < 0)
    return undefined;
  const percentage = Math.round(device.batteryLevel * 100);
  const color =
    percentage <= 20
      ? Color.Red
      : percentage <= 50
        ? Color.Orange
        : Color.Green;
  return {
    tag: { value: `${percentage}%`, color },
    tooltip: device.batteryStatus
      ? `Battery: ${device.batteryStatus}`
      : "Battery level",
  };
}

function groupDevices(
  devices: FindMyDevice[],
): Array<[string, FindMyDevice[]]> {
  const groups = new Map<string, FindMyDevice[]>();
  for (const device of devices) {
    const group = groups.get(device.owner) ?? [];
    group.push(device);
    groups.set(device.owner, group);
  }

  return Array.from(groups.entries())
    .map(
      ([owner, ownerDevices]) =>
        [owner, ownerDevices.sort((a, b) => a.name.localeCompare(b.name))] as [
          string,
          FindMyDevice[],
        ],
    )
    .sort(([ownerA], [ownerB]) => {
      if (ownerA === "My Devices") return -1;
      if (ownerB === "My Devices") return 1;
      return ownerA.localeCompare(ownerB);
    });
}

async function requestSound(device: FindMyDevice): Promise<void> {
  if (!device.soundAvailable) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sound Not Available",
      message: `${device.name} cannot play a Find My sound.`,
    });
    return;
  }

  if (device.isFamily) {
    const confirmed = await confirmAlert({
      title: `Play Sound on ${device.name}?`,
      message:
        "This device belongs to a family member. They will hear an alert.",
      primaryAction: { title: "Play Sound" },
    });
    if (!confirmed) return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Pinging ${device.name}`,
  });
  try {
    await playSound(device);
    toast.style = Toast.Style.Success;
    toast.title = "Play Sound Sent";
    toast.message = device.name;
  } catch (error) {
    const bridgeError = error as { message?: string };
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Play Sound";
    toast.message = bridgeError.message || String(error);
  }
}

function SetupActions({
  state,
  refresh,
  onSignOut,
}: {
  state: LoadState;
  refresh: () => void;
  onSignOut?: () => void;
}) {
  const showSignIn =
    state.kind === "helper-missing" ||
    state.kind === "auth-required" ||
    state.kind === "error";

  return (
    <ActionPanel>
      {showSignIn ? (
        <Action
          title={
            state.kind === "helper-missing"
              ? "Install Helper and Sign in"
              : "Sign in Again"
          }
          icon={Icon.Terminal}
          onAction={async () => {
            try {
              await openSetupInTerminal();
              await showToast({
                style: Toast.Style.Success,
                title: "Setup Opened in Terminal",
                message: "Return here after sign-in, then refresh.",
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could Not Open Setup",
                message: String(error),
              });
            }
          }}
        />
      ) : null}
      <Action
        title="Refresh Devices"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
      {onSignOut && state.kind !== "helper-missing" ? (
        <Action
          title="Sign out and Clear Session"
          icon={Icon.Logout}
          style={Action.Style.Destructive}
          onAction={onSignOut}
        />
      ) : null}
    </ActionPanel>
  );
}

function EmptyState({
  state,
  refresh,
  onSignOut,
}: {
  state: LoadState;
  refresh: () => void;
  onSignOut?: () => void;
}) {
  const actions = (
    <SetupActions state={state} refresh={refresh} onSignOut={onSignOut} />
  );

  switch (state.kind) {
    case "helper-missing":
      return (
        <List.EmptyView
          icon={Icon.Shield}
          title="One-Time Setup Required"
          description={`Install hash-verified PyiCloud ${helperVersion()} packages and sign in in Terminal. Your Apple password and 2FA code are never entered in Raycast or saved in Keychain.`}
          actions={actions}
        />
      );
    case "auth-required":
      return (
        <List.EmptyView
          icon={Icon.Lock}
          title="Apple Sign-In Required"
          description="Open the local Terminal sign-in. Enter your password and 2FA code there. The saved web session has broad iCloud access, so use this only on your Mac."
          actions={actions}
        />
      );
    case "error":
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot Load Find My Devices"
          description={state.message}
          actions={actions}
        />
      );
    case "ready":
      return (
        <List.EmptyView
          icon={Icon.Mobile}
          title="No Devices Found"
          description="Apple returned no Find My devices for this account."
          actions={actions}
        />
      );
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export default function Command() {
  const { appleAccount, includeFamily } =
    getPreferenceValues<Preferences.FindMyDevices>();
  const { data, isLoading, revalidate } = useCachedPromise(
    loadState,
    [appleAccount, includeFamily],
    { keepPreviousData: true },
  );
  const state: LoadState = data ?? { kind: "ready", devices: [] };
  const devices = state.kind === "ready" ? state.devices : [];
  const groups = groupDevices(devices);

  async function confirmSignOut() {
    const confirmed = await confirmAlert({
      title: "Sign Out and Clear Find My Session?",
      message:
        "This removes the saved local iCloud web session. You must use your password and 2FA code again before you can use this extension.",
      primaryAction: {
        title: "Sign Out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Signing Out",
    });
    try {
      const result = await signOut();
      toast.style = Toast.Style.Success;
      toast.title = "Local Session Cleared";
      toast.message = result.remoteLogoutConfirmed
        ? "Apple also confirmed the remote sign-out."
        : "Remote sign-out was not confirmed.";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Sign Out";
      toast.message = String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search devices or people…"
    >
      {!isLoading && (state.kind !== "ready" || devices.length === 0) ? (
        <EmptyState
          state={state}
          refresh={revalidate}
          onSignOut={confirmSignOut}
        />
      ) : null}

      {groups.map(([owner, ownerDevices]) => (
        <List.Section
          key={owner}
          title={owner}
          subtitle={`${ownerDevices.length} ${ownerDevices.length === 1 ? "device" : "devices"}`}
        >
          {ownerDevices.map((device) => {
            const battery = batteryAccessory(device);
            return (
              <List.Item
                key={device.id}
                id={device.id}
                icon={deviceIcon(device)}
                title={device.name}
                subtitle={device.displayName || device.deviceModel}
                keywords={
                  [
                    owner,
                    device.displayName,
                    device.deviceModel,
                    device.deviceClass,
                  ].filter(Boolean) as string[]
                }
                accessories={[
                  ...(battery ? [battery] : []),
                  ...(!device.soundAvailable
                    ? [{ text: "Sound unavailable", icon: Icon.SpeakerOff }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={
                          device.soundAvailable
                            ? "Play Sound"
                            : "Sound Not Available"
                        }
                        icon={
                          device.soundAvailable
                            ? Icon.SpeakerHigh
                            : Icon.SpeakerOff
                        }
                        onAction={() => requestSound(device)}
                      />
                      <Action
                        title="Refresh Devices"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        title="Open Find My"
                        url="https://www.icloud.com/find/"
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <Action.CopyToClipboard
                        title="Copy Device ID"
                        content={device.id}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action
                        title="Open Extension Preferences"
                        icon={Icon.Gear}
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Sign out and Clear Session"
                        icon={Icon.Logout}
                        style={Action.Style.Destructive}
                        onAction={confirmSignOut}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
