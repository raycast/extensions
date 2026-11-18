import { execFile } from "child_process";
import { promisify } from "util";
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

const execFileAsync = promisify(execFile);

async function bootSimulator(identifier: string): Promise<boolean> {
  try {
    await execFileAsync("xcrun", ["simctl", "boot", identifier]);
    return true;
  } catch (error) {
    if ((error as { stderr?: string })?.stderr?.includes("current state: Booted")) {
      return false;
    }
    throw error;
  }
}

async function openSimulatorApp(identifier: string) {
  try {
    // Xcode 27 replaced Simulator.app with Device Hub, which opens a device by URL.
    await execFileAsync("open", [
      "-b",
      "com.apple.dt.Devices",
      `devices://device/open?id=${encodeURIComponent(identifier)}`,
    ]);
  } catch {
    // Simulator.app (Xcode 26 and earlier)
    await execFileAsync("open", ["-b", "com.apple.iphonesimulator", "--args", "-CurrentDeviceUDID", identifier]);
  }
}

export function runSimulator(identifier: string): void {
  showToast({
    style: Toast.Style.Animated,
    title: "Running Simulator",
  });
  bootSimulator(identifier)
    .then(async (booted) => {
      await openSimulatorApp(identifier);
      if (!booted) {
        await showToast({ style: Toast.Style.Success, title: "Simulator is already running" });
      }
      closeMainWindow({ clearRootSearch: true });
    })
    .catch(() => {
      showToast({
        style: Toast.Style.Failure,
        title: "Unknown error",
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
