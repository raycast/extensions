import { getPreferenceValues } from "@raycast/api";
import { getCmdPath, runCommand } from "./utils";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const cmdPath = getCmdPath();

export async function toggleDisplay(tagID: string): Promise<string> {
  const command = `${cmdPath} toggle -tagID=${tagID} -feature=connected`;
  return runCommand(command, `Error toggling display with tagID ${tagID}`);
}

export async function fetchPipStatus(tagID: string): Promise<string> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -feature=pip -tagID=${tagID}`);
    const status = stdout.trim();
    return status;
  } catch (error) {
    console.error(`Failed to fetch display PIP status for tagID ${tagID}`, error);
    return "";
  }
}

export async function togglePIP(tagID: string): Promise<string> {
  try {
    const command = `${cmdPath} toggle -tagID=${tagID} -feature=pip`;
    return runCommand(command, `Error toggling PIP for display with tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to toggle PIP status for tagID ${tagID}`, error);
    return "";
  }
}

export async function fetchDisplayModeList(tagID: string): Promise<string> {
  try {
    const command = `${cmdPath} get -tagID=${tagID} -feature=displayModeList`;
    return runCommand(command, `Error fetching display mode list for tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to fetch display mode list for tagID ${tagID}`, error);
    return "";
  }
}

export async function setDisplayResolution(tagID: string, modeNumber: string): Promise<string> {
  try {
    const command = `${cmdPath} set -tagID=${tagID} -feature=displayModeNumber -value=${modeNumber}`;
    return runCommand(command, `Error setting display resolution for tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to set display resolution to ${modeNumber} for tagID ${tagID}`, error);
    return "";
  }
}

export async function availabilityBrightness(tagID: string): Promise<boolean> {
  const command = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  try {
    await runCommand(command, `Error checking brightness for tagID ${tagID}`);
    return true;
  } catch (error) {
    console.error(`Failed to check brightness for tagID ${tagID}`, error);
    return false;
  }
}

export async function availabilityContrast(tagID: string): Promise<boolean> {
  const command = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  try {
    await runCommand(command, `Error checking contrast for tagID ${tagID}`);
    return true;
  } catch (error) {
    console.error(`Failed to check contrast for tagID ${tagID}`, error);
    return false;
  }
}

export async function setBrightness(tagID: string, brightnessIntensity?: number): Promise<string> {
  try {
    const setCmd = `${cmdPath} set -tagID=${tagID} -feature=brightness -value=${brightnessIntensity}`;
    return runCommand(setCmd, `Error setting brightness for tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to set brightness for tagID ${tagID}`, error);
    return "";
  }
}

export async function increaseBrightness(tagID: string, brightnessIncrement?: number): Promise<string> {
  if (typeof brightnessIncrement !== "number") {
    const { brightnessIncrement: prefIncrement } = getPreferenceValues<{ brightnessIncrement: string }>();
    brightnessIncrement = Number(prefIncrement) || 0.05;
  }
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  const currStr = await runCommand(getCmd, `Error getting current brightness for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  if (isNaN(currentValue)) {
    console.error(`Failed to set brightness for tagID ${tagID}, the current value is not a number`);
    return "";
  }
  const newValue = Math.min(1, currentValue + brightnessIncrement);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=brightness -value=${newValue}`;
  try {
    return runCommand(setCmd, `Error setting brightness for tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to set brightness for tagID ${tagID}`, error);
    return "";
  }
}

export async function decreaseBrightness(tagID: string, brightnessIncrement?: number): Promise<string> {
  if (typeof brightnessIncrement !== "number") {
    const { brightnessIncrement: prefIncrement } = getPreferenceValues<{ brightnessIncrement: string }>();
    brightnessIncrement = Number(prefIncrement) || 0.05;
  }
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  const currStr = await runCommand(getCmd, `Error getting current brightness for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.max(0, currentValue - brightnessIncrement);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=brightness -value=${newValue}`;
  try {
    return runCommand(setCmd, `Error setting brightness for tagID ${tagID}`);
  } catch (error) {
    return "";
  }
}

export async function setContrast(tagID: string, contrastIntensity?: number): Promise<string> {
  try {
    const setCmd = `${cmdPath} set -tagID=${tagID} -feature=contrast -value=${contrastIntensity}`;
    return runCommand(setCmd, `Error setting contrast for tagID ${tagID}`);
  } catch (error) {
    console.error(`Failed to set contrast for tagID ${tagID}`, error);
    return "";
  }
}

export async function increaseContrast(tagID: string, contrastIncrement?: number): Promise<string> {
  if (typeof contrastIncrement !== "number") {
    const { contrastIncrement: prefIncrement } = getPreferenceValues<{ contrastIncrement: string }>();
    contrastIncrement = Number(prefIncrement) || 0.05;
  }
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  const currStr = await runCommand(getCmd, `Error getting current contrast for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.min(0.9, currentValue + contrastIncrement);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=contrast -value=${newValue}`;
  try {
    return runCommand(setCmd, `Error setting contrast for tagID ${tagID}`);
  } catch (error) {
    return "";
  }
}

export async function decreaseContrast(tagID: string, contrastIncrement?: number): Promise<string> {
  if (typeof contrastIncrement !== "number") {
    const { contrastIncrement: prefIncrement } = getPreferenceValues<{ contrastIncrement: string }>();
    contrastIncrement = Number(prefIncrement) || 0.05;
  }
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  const currStr = await runCommand(getCmd, `Error getting current contrast for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.max(-0.9, currentValue - contrastIncrement);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=contrast -value=${newValue}`;
  try {
    return runCommand(setCmd, `Error setting contrast for tagID ${tagID}`);
  } catch (error) {
    return "";
  }
}

export async function fetchDisplays(): Promise<string> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -identifiers`);
    return stdout;
  } catch (error) {
    console.error("Failed to fetch displays", error);
    return "";
  }
}

export async function fetchDisplayStatus(tagID: string): Promise<string> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -feature=connected -tagID=${tagID}`);
    const status = stdout.trim();
    if (status.toLowerCase() === "on,on") return "on";
    if (status.toLowerCase() === "on,off") return "off";
    return status;
  } catch (error) {
    console.error(`Failed to fetch display status for tagID ${tagID}`, error);
    return "off";
  }
}

export async function fetchDisplayResolution(tagID: string): Promise<string> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -tagID=${tagID} -feature=resolution`);
    return stdout.trim();
  } catch (error) {
    console.error(`Failed to fetch display resolution for tagID ${tagID}`, error);
    return "";
  }
}

export async function fetchMainDisplay(): Promise<Display | null> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -identifiers -displayWithMainStatus`);
    try {
      return JSON.parse(stdout.trim());
    } catch (parseError) {
      console.error("Failed to parse display data as JSON", parseError);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch main display", error);
    return null;
  }
}

export type Display = {
  UUID: string;
  alphanumericSerial?: string;
  deviceType: string;
  displayID: string;
  model: string;
  name: string;
  originalName?: string;
  productName?: string;
  registryLocation?: string;
  serial: string;
  tagID: string;
  vendor: string;
  weekOfManufacture?: string;
  yearOfManufacture?: string;
};
