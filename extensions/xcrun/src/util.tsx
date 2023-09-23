import { exec } from "child_process";
import { Device, SimualtorResponse } from "./types";

async function executeAsync(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Timeout"));
    }, 5000);

    exec(cmd, (err, stdout) => {
      if (err != null) {
        clearTimeout(timeoutId);
        reject(err);
        return;
      }
      clearTimeout(timeoutId);
      resolve(stdout);
    });
  });
}

export async function fetchSimulators(): Promise<Device[]> {
  const stdout = await executeAsync("xcrun simctl list --json devices");
  const list: SimualtorResponse = JSON.parse(stdout);
  return Object.keys(list.devices)
    .map((key) => {
      return list.devices[key];
    })
    .flat();
}

export async function uninstallApp(device: string, bundleId: string) {
  await executeAsync(`xcrun simctl uninstall ${device} ${bundleId}`);
}

export async function launchApp(device: string, bundleId: string) {
  await executeAsync(`xcrun simctl launch ${device} ${bundleId}`);
}

export async function terminateApp(device: string, bundleId: string) {
  await executeAsync(`xcrun simctl terminate ${device} ${bundleId}`);
}

export async function getAppContainer(device: string, bundleId: string, container: string): Promise<string> {
  return await executeAsync(`xcrun simctl get_app_container ${device} ${bundleId} ${container}`);
}

export async function icloudSync(device: string): Promise<string> {
  return await executeAsync(`xcrun simctl icloud_sync ${device}`);
}

export async function openUrl(device: string, url: string): Promise<string> {
  return await executeAsync(`xcrun simctl openurl ${device} ${url}`);
}
export async function privacy(device: string, bundleId: string, action: string, service: string): Promise<string> {
  return await executeAsync(`xcrun simctl privacy ${device} ${action} ${service} ${bundleId}`);
}
export async function rename(device: string, name: string): Promise<string> {
  return await executeAsync(`xcrun simctl rename ${device} ${name}`);
}

export async function pushNotification(device: string, bundleId: string, filePath: string): Promise<string> {
  return await executeAsync(`xcrun simctl push ${device} ${bundleId} ${filePath}`);
}

export async function installApp(device: string, filePath: string): Promise<string> {
  return await executeAsync(`xcrun simctl install ${device} ${filePath}`);
}

export async function erase(device: string): Promise<string> {
  return await executeAsync(`xcrun simctl erase ${device}`);
}

export async function getBootedSimulators(): Promise<Device[]> {
  return (await fetchSimulators()).filter((device) => device.state === "Booted");
}
