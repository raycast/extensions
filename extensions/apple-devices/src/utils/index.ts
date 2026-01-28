import { runAppleScript } from "run-applescript";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import Devices from "../data/devices.json";
import { Device, Simulator } from "../types";

export async function getAvailableSimulators() {
  return await runAppleScript('do shell script "xcrun simctl list --json devices available"').then((result) => {
    const simulatorDevices = JSON.parse(result)?.devices;
    const allSimulators: Simulator[] = [];

    Object.values(simulatorDevices).forEach((value) => {
      allSimulators.push(...(value as Simulator[]));
    });

    return allSimulators;
  });
}

export function runSimulator(identifier: string): void {
  showToast({
    style: Toast.Style.Animated,
    title: "Running Simulator",
  });
  runAppleScript(`
    tell application "System Events"
      if (get name of every application process) contains "Simulator" then\t
        do shell script "xcrun simctl boot ${identifier}"
      else
        do shell script "open -a Simulator --args -CurrentDeviceUDID ${identifier}"
      end if
    end tell
  `)
    .then(() => {
      closeMainWindow({ clearRootSearch: true });
    })
    .catch((error) => {
      const isBooted = error?.message?.includes("current state: Booted");

      showToast({
        style: isBooted ? Toast.Style.Success : Toast.Style.Failure,
        title: isBooted ? "Simulator is already running" : "Unknown error",
      });
    });
}

export function shutdownSimulator(identifier: string): void {
  showToast({
    style: Toast.Style.Animated,
    title: "Shutting down Simulator",
  });
  runAppleScript(`do shell script "xcrun simctl shutdown ${identifier}"`)
    .then(() => {
      closeMainWindow({ clearRootSearch: true });
    })
    .catch((error) => {
      const isShutdown = error?.message?.includes("current state: Shutdown");

      showToast({
        style: isShutdown ? Toast.Style.Success : Toast.Style.Failure,
        title: isShutdown ? "Simulator is already shutdown" : "Unknown error",
      });
    });
}

export function getSimulatorUdId(deviceUdId: string, availableSimulators?: Simulator[]): string | undefined {
  const found: Simulator | undefined = availableSimulators?.find((element: Simulator): boolean => {
    const regex = /-8GB|-16GB/i;
    return element.deviceTypeIdentifier.replace(regex, "") === `com.apple.CoreSimulator.SimDeviceType.${deviceUdId}`;
  });

  return found?.udid;
}

export function getDevices(devicesFilter?: string) {
  const filteredDevices: Device[] = devicesFilter
    ? Devices.filter((device: Device) => {
        return devicesFilter === "all" || device.device === devicesFilter;
      })
    : Devices;

  // Group devices by year
  return Object.entries(filteredDevices).reduce((group: { [year: string]: Device[] }, [, device]) => {
    const { year } = device;
    group[year] = group[year] ?? [];
    group[year].push(device);

    return group;
  }, {});
}

export function getDeviceById(identifier?: string): Device | undefined {
  return Devices.find((device) => {
    return device.identifier === identifier;
  });
}
