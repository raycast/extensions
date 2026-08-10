import { runAppleScript } from "@raycast/utils";
import { Command, Device, DeviceType, Platform } from "./types";

export async function getDevices(platform: Platform, deviceType: DeviceType): Promise<Device[]> {
  const devices = await runAppleScript(`
      tell application "MiniSim"
          getDevices platform "${platform}" deviceType "${deviceType}"
      end tell
    `);
  return JSON.parse(devices);
}

export async function launchDevice(deviceName: string) {
  await runAppleScript(`
      tell application "MiniSim"
            launchDevice deviceName "${deviceName}"
      end tell
    `);
}

export async function getCommands(platform: Platform, deviceType: DeviceType): Promise<Command[]> {
  const commands = await runAppleScript(`
    tell application "MiniSim"
        getCommands platform "${platform}" deviceType "${deviceType}"
    end tell
    `);
  return JSON.parse(commands);
}

export async function executeCommand(command: Command, deviceName: string, deviceId: string, deviceType: DeviceType) {
  await runAppleScript(`
    tell application "MiniSim"
      executeCommand commandName "${command.name}" commandTag "${command.tag}" platform "${command.platform}" deviceName "${deviceName}" deviceId "${deviceId}" deviceType "${deviceType}"
    end tell
    `);
}
