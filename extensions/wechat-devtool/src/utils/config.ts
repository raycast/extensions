import path from "path";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import { showFailureToast } from "@raycast/utils";
import { environment, getApplications, showToast, Toast } from "@raycast/api";
import { DeviceConfig, ExtensionConfig, Project } from "../types";

const CONFIG_DIR = environment.supportPath;
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

async function ensureConfigDir() {
  try {
    await access(CONFIG_DIR);
  } catch {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

export function getCurrentDeviceName() {
  try {
    return execSync("/usr/sbin/scutil --get ComputerName", { encoding: "utf8" }).trim();
  } catch (error) {
    console.error("Failed to get computer name:", error);
    return "Unknown Device";
  }
}

export async function loadConfig(): Promise<ExtensionConfig> {
  try {
    await ensureConfigDir();
    try {
      const content = await readFile(CONFIG_PATH, "utf8");
      return JSON.parse(content);
    } catch {
      // File doesn't exist, return empty config
      return {};
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    return {};
  }
}

export async function saveConfig(config: ExtensionConfig) {
  try {
    await ensureConfigDir();
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

export async function getCurrentDeviceConfig() {
  const currentDeviceName = getCurrentDeviceName();
  const deviceConfigs = await loadConfig();

  for (const [, deviceConfig] of Object.entries(deviceConfigs)) {
    if (deviceConfig.name === currentDeviceName) {
      return deviceConfig;
    }
  }

  return null;
}

export async function getAllDeviceConfigs() {
  return await loadConfig();
}

export async function updateDeviceConfig(deviceId: string, deviceConfig: DeviceConfig) {
  const config = await loadConfig();
  config[deviceId] = deviceConfig;
  await saveConfig(config);
}

export async function addProjectToDevice(deviceId: string, project: Project) {
  const config = await loadConfig();
  if (!config[deviceId]) {
    config[deviceId] = { name: "", cliPath: "", projects: [] };
  }
  config[deviceId].projects.push(project);
  await saveConfig(config);
}

export async function removeProjectFromDevice(deviceId: string, projectId: string) {
  const config = await loadConfig();
  if (config[deviceId]) {
    config[deviceId].projects = config[deviceId].projects.filter((project) => project.id !== projectId);
    await saveConfig(config);
  }
}

export async function deleteDevice(deviceId: string) {
  const config = await loadConfig();
  if (config[deviceId]) {
    delete config[deviceId];
    await saveConfig(config);
  }
}

export async function isDeviceNameExists(deviceName: string, excludeDeviceId?: string) {
  const config = await loadConfig();
  for (const [deviceId, deviceConfig] of Object.entries(config)) {
    if (deviceConfig.name === deviceName && deviceId !== excludeDeviceId) {
      return true;
    }
  }
  return false;
}

export async function getDeviceIdByName(deviceName: string) {
  const config = await loadConfig();
  for (const [deviceId, deviceConfig] of Object.entries(config)) {
    if (deviceConfig.name === deviceName) {
      return deviceId;
    }
  }
  return null;
}

export async function findWeChatDevtool() {
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

export function generateUUID() {
  return randomUUID();
}

export async function saveOrUpdateDevice(data: DeviceConfig, deviceId?: string) {
  const config = await getAllDeviceConfigs();

  const isDuplicate = Object.entries(config).some(([id, d]) => d.name === data.name && id !== deviceId);
  if (isDuplicate) {
    const error = new Error(`Device name "${data.name}" already exists. Please use a different name.`);
    await showFailureToast(error, { title: "Duplicate Device Name" });
    return { success: false, error: "duplicate" };
  }
  let id = deviceId;
  if (!id) {
    id = generateUUID();
  }
  config[id] = data;
  await saveConfig(config);
  await showToast({
    style: Toast.Style.Success,
    title: "Configuration Saved",
    message: `Saved "${data.name}" configuration`,
  });
  return { success: true, deviceId: id, deviceName: data.name };
}

export async function updateProjectLastUsed(deviceConfig: DeviceConfig, projectId: string) {
  const config = await getAllDeviceConfigs();
  const deviceId = Object.keys(config).find((id) => config[id].name === deviceConfig.name);
  if (!deviceId) return;
  const device = config[deviceId];
  const project = device.projects.find((p) => p.id === projectId);
  if (project) {
    project.lastUsedAt = Date.now();
    await saveConfig(config);
  }
}
