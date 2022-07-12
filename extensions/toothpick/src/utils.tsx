import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

function stringToBool(s: string): boolean {
  return s === "true" ? true : false;
}

function getSortIndices(deviceNames: string[], deviceStatuses: boolean[]): number[] {
  return Array.from(Array(deviceNames.length).keys()).sort((a, b) => {
    if (deviceStatuses[a] === deviceStatuses[b]) {
      return deviceNames[a].localeCompare(deviceNames[b]);
    }
    return deviceStatuses[a] ? -1 : 1;
  });
}

interface Devices {
  deviceNames: string[];
  deviceAddresses: string[];
  deviceStatuses: boolean[];
  deviceBatteries: string[];
}

export async function getBluetoothDevices(): Promise<Devices> {
  const response: string = await runAppleScript(`
    use framework "IOBluetooth"
    set deviceList to {}
    set deviceStatus to {}
    set deviceAddresses to {}
    repeat with device in (current application's IOBluetoothDevice's pairedDevices() as list)
      copy (device's nameOrAddress as string) to the end of deviceList
      copy (device's isConnected as boolean) to the end of deviceStatus
      copy (device's addressString as string) to the end of deviceAddresses
    end repeat
    return {deviceList, deviceStatus, deviceAddresses}
  `);
  console.log(response);
  const results = response.split(",");
  let deviceNames = results.slice(0, results.length / 3).map((deviceName) => deviceName.trim());
  let deviceStatuses = results
    .slice(results.length / 3, (results.length / 3) * 2)
    .map((deviceStatus) => deviceStatus.trim())
    .map((deviceStatus) => stringToBool(deviceStatus));
  let deviceAddresses = results
    .slice((results.length / 3) * 2, results.length)
    .map((deviceStatus) => deviceStatus.trim());
  const indices = getSortIndices(deviceNames, deviceStatuses);
  deviceNames = indices.map((i) => deviceNames[i]);
  deviceStatuses = indices.map((i) => deviceStatuses[i]);
  deviceAddresses = indices.map((i) => deviceAddresses[i]);
  const batteryMap: Record<string, string> = {};
  try {
    const batteryResponse: string = await runAppleScript(
      `do shell script "/usr/sbin/ioreg -c AppleDeviceManagementHIDEventService | grep -e BatteryPercent -e DeviceAddress"`
    );
    const addressBattery = batteryResponse
      .split("\r")
      .filter((x) => x.match("(DeviceAddress)|(BatteryPercent)"))
      .map((x) => {
        const matches = /"([A-z]+)"[\s=]+(["\- A-z0-9]+)/.exec(x);
        if (matches) {
          return [matches[1], matches[2].replace('"', "").replace('"', "")];
        } else {
          return ["", ""];
        }
      });
    for (let i = 0; i < addressBattery.length - 1; i++) {
      if (addressBattery[i][0] === "DeviceAddress" && addressBattery[i + 1][0] === "BatteryPercent") {
        batteryMap[addressBattery[i][1]] = addressBattery[i + 1][1];
      }
    }
  } catch (e) {
    // Means battery response failed
  }

  const deviceBatteries = deviceAddresses.map((x) => batteryMap[x] ?? "");
  return { deviceNames, deviceAddresses, deviceStatuses, deviceBatteries };
}

export async function toggleBluetoothDevice(deviceName: string): Promise<boolean> {
  const response: string = await runAppleScript(`
    use framework "IOBluetooth"

    on getMatchingDevice(deviceName)
      repeat with device in (current application's IOBluetoothDevice's pairedDevices() as list)
        if (device's nameOrAddress as string) contains deviceName then return device
      end repeat
    end getMatchingDevice

    set device to getMatchingDevice("${deviceName}")
    if not (device's isConnected as boolean) then
      if device's openConnection() = 0 then
        return "1"
      end if
      return "0"
    else
      if device's closeConnection() = 0 then
        return "1"
      end if
      return "0" 
    end if
  `);
  return response === "1" ? true : false;
}

export async function openBluetoothPreferences() {
  await closeMainWindow();
  await runAppleScript(`
    tell application "System Preferences"
      activate
      if exists window "Bluetooth" then
        tell window "Bluetooth" to if it is miniaturized then set minitiaruzied to false
      else
        set current pane to pane "com.apple.preferences.Bluetooth"
      end if
    end tell
  `);
}
