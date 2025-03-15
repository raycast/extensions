import { Action, Icon, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Device } from "../types";
import {
  executeSimulatorCommand,
  openSimulator,
  startAndroidEmulator,
  stopAndroidEmulator,
  openAndroidEmulator,
} from "../utils/simulator-commands";

const ACTION_TITLES = {
  BOOT_IOS: "Boot Simulator",
  SHUTDOWN_IOS: "Shutdown Simulator",
  OPEN_IOS: "Open Simulator",
  BOOT_ANDROID: "Boot Emulator",
  SHUTDOWN_ANDROID: "Shutdown Emulator",
  OPEN_ANDROID: "Open Emulator",
  REFRESH: "Refresh Devices",
  COPY_ID: "Copy Device Id",
  CONFIGURE: "Configure Android Sdk Path",
};

interface DeviceActionsProps {
  device: Device;
  onRefresh: () => void;
}

export function IOSDeviceActions({ device, onRefresh }: DeviceActionsProps) {
  const executeWithErrorHandling = async (action: () => Promise<void> | void) => {
    try {
      await action();
      onRefresh();
    } catch (error) {
      showFailureToast(error);
    }
  };

  const bootSimulator = () => executeSimulatorCommand("boot", device.id, "Simulator booted successfully");
  const shutdownSimulator = () => executeSimulatorCommand("shutdown", device.id, "Simulator shut down successfully");
  const openIOSSimulator = async () => openSimulator(device.id);

  return (
    <>
      {device.status !== "Booted" && (
        <Action
          title={ACTION_TITLES.BOOT_IOS}
          icon={Icon.Play}
          onAction={() => executeWithErrorHandling(bootSimulator)}
        />
      )}
      {device.status === "Booted" && (
        <Action
          title={ACTION_TITLES.SHUTDOWN_IOS}
          icon={Icon.Stop}
          onAction={() => executeWithErrorHandling(shutdownSimulator)}
        />
      )}
      <Action
        title={ACTION_TITLES.OPEN_IOS}
        icon={Icon.Eye}
        onAction={() => executeWithErrorHandling(openIOSSimulator)}
      />
    </>
  );
}

export function AndroidDeviceActions({ device, onRefresh }: DeviceActionsProps) {
  const executeWithErrorHandling = async (action: () => Promise<void> | void) => {
    try {
      await action();
      onRefresh();
    } catch (error) {
      showFailureToast(error);
    }
  };

  const bootEmulator = () => startAndroidEmulator(device.id);
  const shutdownEmulator = () => stopAndroidEmulator(device.id);
  const openEmulator = async () => openAndroidEmulator(device.id);

  return (
    <>
      {device.status !== "Booted" && (
        <Action
          title={ACTION_TITLES.BOOT_ANDROID}
          icon={Icon.Play}
          onAction={() => executeWithErrorHandling(bootEmulator)}
        />
      )}
      {device.status === "Booted" && (
        <Action
          title={ACTION_TITLES.SHUTDOWN_ANDROID}
          icon={Icon.Stop}
          onAction={() => executeWithErrorHandling(shutdownEmulator)}
        />
      )}
      <Action
        title={ACTION_TITLES.OPEN_ANDROID}
        icon={Icon.Eye}
        onAction={() => executeWithErrorHandling(openEmulator)}
      />
    </>
  );
}

export function CommonDeviceActions({ device, onRefresh }: DeviceActionsProps) {
  return (
    <>
      <Action
        title={ACTION_TITLES.REFRESH}
        icon={Icon.RotateClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action.CopyToClipboard title={ACTION_TITLES.COPY_ID} content={device.id} />
      <Action
        title={ACTION_TITLES.CONFIGURE}
        icon={Icon.Gear}
        onAction={() => openExtensionPreferences()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      />
    </>
  );
}
