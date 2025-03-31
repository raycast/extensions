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
    // Normalize "on,on" to "on"
    if (status.toLowerCase() === "on,on") {
      return "on";
    }
    if (status.toLowerCase() === "on,off") {
      return "off";
    }
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
    return "N/A";
  }
}

export async function fetchMainDisplay(): Promise<Display | null> {
  try {
    const { stdout } = await execPromise(`${cmdPath} get -identifiers -displayWithMainStatus`);
    // Parse the returned JSON object directly.
    return JSON.parse(stdout.trim());
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
