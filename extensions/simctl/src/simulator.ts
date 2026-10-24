import { execFile } from "child_process";
import { existsSync } from "fs";
import { basename, join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function getSimulatorApplication() {
  const selectedDirectory = process.env.DEVELOPER_DIR || (await execFileAsync("xcode-select", ["-p"])).stdout.trim();
  const developerDirectory = selectedDirectory.endsWith(".app")
    ? join(selectedDirectory, "Contents/Developer")
    : selectedDirectory;
  const applications = [
    join(developerDirectory, "../Applications/DeviceHub.app"),
    join(developerDirectory, "Applications/Simulator.app"),
  ];
  const application = applications.find((path) => existsSync(path));
  if (!application) {
    throw new Error("Device Hub or Simulator was not found in the selected Xcode. Check xcode-select -p.");
  }
  return application;
}

export async function openSimulator(device: { udid: string; state: string; name: string }) {
  const application = await getSimulatorApplication();
  // The cached list may be stale after a failed launch or changes outside Raycast.
  const { stdout } = await execFileAsync("xcrun", ["simctl", "list", "--json", "devices"]);
  const list: { devices: Record<string, { udid: string; state: string }[]> } = JSON.parse(stdout);
  const currentDevice = Object.values(list.devices)
    .flat()
    .find(({ udid }) => udid === device.udid);
  if (!currentDevice) {
    throw new Error(`Simulator "${device.name}" is no longer available. Refresh the device list and try again.`);
  }
  if (currentDevice.state !== "Booted") {
    await execFileAsync("xcrun", ["simctl", "boot", device.udid]);
  }
  // Device Hub ignores Simulator's -CurrentDeviceUDID argument and uses a URL instead.
  const args =
    basename(application) === "DeviceHub.app"
      ? ["-a", application, `devices://device/open?id=${encodeURIComponent(device.udid)}`]
      : ["-a", application, "--args", "-CurrentDeviceUDID", device.udid];
  await execFileAsync("open", args);
  if (basename(application) === "Simulator.app") {
    // Keep the existing window focus behavior when Simulator is already running.
    // Pass the device name as an argument so quotes in renamed devices are safe.
    await execFileAsync(
      "osascript",
      [
        "-e",
        `on run argv
        set deviceName to item 1 of argv
        tell application "System Events"
          repeat 100 times
            if exists process "Simulator" then
              tell process "Simulator"
                repeat with simulatorWindow in windows
                  if name of simulatorWindow contains deviceName then
                    set frontmost to true
                    perform action "AXRaise" of simulatorWindow
                    return
                  end if
                end repeat
              end tell
            end if
            delay 0.1
          end repeat
        end tell
        error "Timed out waiting for the Simulator window."
      end run`,
        device.name,
      ],
      { timeout: 15000 },
    );
  }
}
