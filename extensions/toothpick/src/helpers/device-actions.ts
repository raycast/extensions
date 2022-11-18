import { showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { readFileSync } from "fs";
import { resolve } from "path";
import { runAppleScriptSync } from "run-applescript";

export function connectDevice(deviceMacAddress: string) {
  const { closeOnSuccessfulConnection } = getPreferenceValues();
  showToast({ style: Toast.Style.Animated, title: "Connecting..." });
  try {
    _openConnection(deviceMacAddress);
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to connect." });
    return;
  }
  showToast({ style: Toast.Style.Success, title: "Device connected successfully." });
  closeOnSuccessfulConnection && closeMainWindow();
}

export function disconnectDevice(deviceMacAddress: string) {
  showToast({ style: Toast.Style.Animated, title: "Disconnecting..." });
  try {
    _closeConnection(deviceMacAddress);
  } catch {
    showToast({ style: Toast.Style.Failure, title: "Failed to disconnect." });
    return;
  }
  showToast({ style: Toast.Style.Success, title: "Device disconnected successfully." });
}

function _openConnection(deviceMacAddress: string) {
  const formattedMacAddress = deviceMacAddress.toUpperCase().replaceAll(":", "-");
  const script = readFileSync(resolve(__dirname, "assets/scripts/connectDevice.applescript")).toString();
  const getFirstMatchingDeviceScript = readFileSync(
    resolve(__dirname, "assets/scripts/getFirstMatchingDevice.applescript")
  ).toString();
  const result = runAppleScriptSync(
    `
    use framework "IOBluetooth"\n
    use scripting additions\n
    \n
    ${getFirstMatchingDeviceScript}\n
    \n
    ${script}\n
    \n
    return connectDevice(getFirstMatchingDevice("${formattedMacAddress}"))`
  );
  if (result !== "0") throw "Failed to connect device.";
}

function _closeConnection(deviceMacAddress: string) {
  const formattedMacAddress = deviceMacAddress.toUpperCase().replaceAll(":", "-");
  const script = readFileSync(resolve(__dirname, "assets/scripts/disconnectDevice.applescript")).toString();
  const getFirstMatchingDeviceScript = readFileSync(
    resolve(__dirname, "assets/scripts/getFirstMatchingDevice.applescript")
  ).toString();
  const result = runAppleScriptSync(
    `
    use framework "IOBluetooth"\n
    use scripting additions\n
    \n
    ${getFirstMatchingDeviceScript}\n
    \n
    ${script}\n
    \n
    return disconnectDevice(getFirstMatchingDevice("${formattedMacAddress}"))`
  );
  if (result !== "0") throw "Failed to disconnect device.";
}
