import { getApplications, showToast, Toast, environment } from "@raycast/api";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { DeviceConfig, ExtensionConfig, Project } from "../types";
import { execSync } from "child_process";

interface DeviceOperationResult {
  success: boolean;
  error?: string;
  deviceId?: string;
  deviceName?: string;
}

const CONFIG_DIR = environment.supportPath;
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getCurrentDeviceName(): string {
  try {
    return execSync("/usr/sbin/scutil --get ComputerName", { encoding: "utf8" }).trim();
  } catch (error) {
    console.error("Failed to get computer name:", error);
    return "Unknown Device";
  }
}

export function loadConfig(): ExtensionConfig {
  try {
    ensureConfigDir();
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }
  return {};
}

export function saveConfig(config: ExtensionConfig): void {
  try {
    ensureConfigDir();
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

export function getCurrentDeviceConfig(): DeviceConfig | null {
  const currentDeviceName = getCurrentDeviceName();
  const deviceConfigs = loadConfig();

  for (const [, deviceConfig] of Object.entries(deviceConfigs)) {
    if (deviceConfig.name === currentDeviceName) {
      return deviceConfig;
    }
  }

  return null;
}

export function getAllDeviceConfigs(): ExtensionConfig {
  return loadConfig();
}

export function updateDeviceConfig(deviceId: string, deviceConfig: DeviceConfig): void {
  const config = loadConfig();
  config[deviceId] = deviceConfig;
  saveConfig(config);
}

export function addProjectToDevice(deviceId: string, project: Project): void {
  const config = loadConfig();
  if (!config[deviceId]) {
    config[deviceId] = { name: "", cliPath: "", projects: [] };
  }
  config[deviceId].projects.push(project);
  saveConfig(config);
}

export function removeProjectFromDevice(deviceId: string, projectId: string): void {
  const config = loadConfig();
  if (config[deviceId]) {
    config[deviceId].projects = config[deviceId].projects.filter((project) => project.id !== projectId);
    saveConfig(config);
  }
}

export function deleteDevice(deviceId: string): void {
  const config = loadConfig();
  if (config[deviceId]) {
    delete config[deviceId];
    saveConfig(config);
  }
}

export function isDeviceNameExists(deviceName: string, excludeDeviceId?: string): boolean {
  const config = loadConfig();
  for (const [deviceId, deviceConfig] of Object.entries(config)) {
    if (deviceConfig.name === deviceName && deviceId !== excludeDeviceId) {
      return true;
    }
  }
  return false;
}

export function getDeviceIdByName(deviceName: string): string | null {
  const config = loadConfig();
  for (const [deviceId, deviceConfig] of Object.entries(config)) {
    if (deviceConfig.name === deviceName) {
      return deviceId;
    }
  }
  return null;
}

export async function findWeChatDevtool(): Promise<string | null> {
  try {
    const applications = await getApplications();
    const wechatDevtool = applications.find(
      (app) => app.name.toLowerCase().includes("wechat") && app.name.toLowerCase().includes("devtool"),
    );
    if (wechatDevtool) {
      return `${wechatDevtool.path}/Contents/MacOS/cli`;
    }
  } catch (error) {
    console.error("Failed to find WeChat Devtool:", error);
  }
  return null;
}

export function generateUUID(): string {
  return randomUUID();
}

export async function saveOrUpdateDevice(data: DeviceConfig, deviceId?: string): Promise<DeviceOperationResult> {
  const config = getAllDeviceConfigs();

  const isDuplicate = Object.entries(config).some(([id, d]) => d.name === data.name && id !== deviceId);
  if (isDuplicate) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Duplicate Device Name",
      message: `Device name "${data.name}" already exists. Please use a different name.`,
    });
    return { success: false, error: "duplicate" };
  }
  let id = deviceId;
  if (!id) {
    id = generateUUID();
  }
  config[id] = data;
  saveConfig(config);
  await showToast({
    style: Toast.Style.Success,
    title: "Save Successful",
    message: `Device "${data.name}" configuration saved`,
  });
  return { success: true, deviceId: id, deviceName: data.name };
}

export function updateProjectLastUsed(deviceConfig: DeviceConfig, projectId: string) {
  const config = getAllDeviceConfigs();
  const deviceId = Object.keys(config).find((id) => config[id].name === deviceConfig.name);
  if (!deviceId) return;
  const device = config[deviceId];
  const project = device.projects.find((p) => p.id === projectId);
  if (project) {
    project.lastUsedAt = Date.now();
    saveConfig(config);
  }
}
