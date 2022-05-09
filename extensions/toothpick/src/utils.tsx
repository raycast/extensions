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
  deviceStatuses: boolean[];
}

export async function getBluetoothDevices(): Promise<Devices> {
  const response: string = await runAppleScript(`
    use framework "IOBluetooth"
    set deviceList to {}
    set deviceStatus to {}
    repeat with device in (current application's IOBluetoothDevice's pairedDevices() as list)
      copy (device's nameOrAddress as string) to the end of deviceList
      copy (device's isConnected as boolean) to the end of deviceStatus
    end repeat
    return {deviceList, deviceStatus}
  `);
  const results = response.split(",");
  let deviceNames = results.slice(0, results.length / 2).map((deviceName) => deviceName.trim());
  let deviceStatuses = results
    .slice(results.length / 2, results.length)
    .map((deviceStatus) => deviceStatus.trim())
    .map((deviceStatus) => stringToBool(deviceStatus));
  const indices = getSortIndices(deviceNames, deviceStatuses);
  deviceNames = indices.map((i) => deviceNames[i]);
  deviceStatuses = indices.map((i) => deviceStatuses[i]);
  return { deviceNames, deviceStatuses };
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
