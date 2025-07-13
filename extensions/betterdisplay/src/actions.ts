import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues, Application, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);
const cliPath = "Contents/MacOS/BetterDisplay";
const { betterdisplayApp } = getPreferenceValues<{ betterdisplayApp: Application }>();
if (!betterdisplayApp?.path) {
  showFailureToast("BetterDisplay app not set", {
    title: "BetterDisplay app not set",
    message: "Please set the BetterDisplay app in the extension preferences.",
  });

  popToRoot();
}
const cmdPath = `${betterdisplayApp.path}/${cliPath}`;

// Helper function to run commands uniformly.
async function runCommand(command: string, errorMsg: string): Promise<string> {
  try {
    const { stdout } = await execPromise(command);
    return stdout.trim();
  } catch (error) {
    console.error(`${errorMsg}:`, error);
    throw error;
  }
}

// Display actions.
export async function toggleDisplay(tagID: string): Promise<string> {
  const command = `${cmdPath} toggle -tagID=${tagID} -feature=connected`;
  return runCommand(command, `Error toggling display with tagID ${tagID}`);
}

export async function togglePIP(tagID: string): Promise<string> {
  const command = `${cmdPath} toggle -tagID=${tagID} -feature=pip`;
  return runCommand(command, `Error toggling PIP for display with tagID ${tagID}`);
}

export async function fetchDisplayModeList(tagID: string): Promise<string> {
  const command = `${cmdPath} get -tagID=${tagID} -feature=displayModeList`;
  return runCommand(command, `Error fetching display mode list for tagID ${tagID}`);
}

export async function setDisplayResolution(tagID: string, modeNumber: string): Promise<string> {
  const command = `${cmdPath} set -tagID=${tagID} -feature=displayModeNumber -value=${modeNumber}`;
  return runCommand(command, `Error setting display resolution for tagID ${tagID}`);
}

// Availability functions to check brightness/contrast capabilities.
export async function availabilityBrightness(tagID: string): Promise<boolean> {
  const command = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  try {
    await runCommand(command, `Error checking brightness for tagID ${tagID}`);
    return true;
  } catch (error) {
    return false;
  }
}

export async function availabilityContrast(tagID: string): Promise<boolean> {
  const command = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  try {
    await runCommand(command, `Error checking contrast for tagID ${tagID}`);
    return true;
  } catch (error) {
    return false;
  }
}

// Brightness adjustments.
export async function increaseBrightness(tagID: string): Promise<string> {
  const { brightnessIncrement } = getPreferenceValues<{ brightnessIncrement: string }>();
  const increment = Number(brightnessIncrement) || 0.05;
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  const currStr = await runCommand(getCmd, `Error getting current brightness for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.min(1, currentValue + increment);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=brightness -value=${newValue}`;
  return runCommand(setCmd, `Error setting brightness for tagID ${tagID}`);
}

export async function decreaseBrightness(tagID: string): Promise<string> {
  const { brightnessIncrement } = getPreferenceValues<{ brightnessIncrement: string }>();
  const increment = Number(brightnessIncrement) || 0.05;
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=brightness`;
  const currStr = await runCommand(getCmd, `Error getting current brightness for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.max(0, currentValue - increment);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=brightness -value=${newValue}`;
  return runCommand(setCmd, `Error setting brightness for tagID ${tagID}`);
}

// Contrast adjustments.
export async function increaseContrast(tagID: string): Promise<string> {
  const { contrastIncrement } = getPreferenceValues<{ contrastIncrement: string }>();
  const increment = Number(contrastIncrement) || 0.05;
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  const currStr = await runCommand(getCmd, `Error getting current contrast for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.min(0.9, currentValue + increment);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=contrast -value=${newValue}`;
  return runCommand(setCmd, `Error setting contrast for tagID ${tagID}`);
}

export async function decreaseContrast(tagID: string): Promise<string> {
  const { contrastIncrement } = getPreferenceValues<{ contrastIncrement: string }>();
  const increment = Number(contrastIncrement) || 0.05;
  const getCmd = `${cmdPath} get -tagID=${tagID} -feature=contrast`;
  const currStr = await runCommand(getCmd, `Error getting current contrast for tagID ${tagID}`);
  const currentValue = parseFloat(currStr);
  const newValue = Math.max(-0.9, currentValue - increment);
  const setCmd = `${cmdPath} set -tagID=${tagID} -feature=contrast -value=${newValue}`;
  return runCommand(setCmd, `Error setting contrast for tagID ${tagID}`);
}
