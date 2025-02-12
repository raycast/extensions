import { closeMainWindow, getApplications, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { runAppleScript } from "run-applescript";
import { openPiaScript, piaPath } from "./constants";
import { Region } from "./types";

async function runPrivateInternetAccessCmd(cmd: string): Promise<void> {
  const apps = await getApplications();
  const app = apps.find((app) => app.name === "Private Internet Access");
  if (!app) {
    await showHUD("Private Internet Access app not found");
    return;
  }
  await closeMainWindow();
  await runAppleScript(openPiaScript);
  await executeCommand(`${piaPath} ${cmd}`);
}

export async function isPIAConnected(): Promise<boolean> {
  try {
    const { stdout } = await executeCommand(`${piaPath} get connectionstate`);
    const trimmed = stdout.trim();
    return trimmed === "Connected" || trimmed === "Connecting" || trimmed === "DisconnectingToReconnect";
  } catch (error) {
    console.error("Error checking PIA connection:", error);
    return false;
  }
}

export async function getPIACurrentRegion(): Promise<string> {
  try {
    // only returns the region if connected
    const connected = await isPIAConnected();
    if (!connected) return "";
    const { stdout } = await executeCommand(`${piaPath} get region`);
    return stdout.trim();
  } catch (error) {
    console.error("Error checking PIA connection:", error);
    return "";
  }
}

export async function getPIARegions(): Promise<Region[]> {
  try {
    const { stdout } = await executeCommand(`${piaPath} get regions`);
    return mapRegionsToDisplayObjects(stdout.trim().split("\n"));
  } catch (error) {
    console.error("Error checking PIA connection:", error);
    return [];
  }
}

export async function connectToPIA(region?: string): Promise<void> {
  if (region) {
    await runPrivateInternetAccessCmd(`set region ${region}`);
  }
  await runPrivateInternetAccessCmd(`connect`);
  const isConnected = await isPIAConnected();
  if (isConnected) {
    await showHUD(`Private Internet Access connected (${region})`);
  }
}

export async function disconnectFromPIA(): Promise<void> {
  await runPrivateInternetAccessCmd(`disconnect`);
  const isConnected = await isPIAConnected();
  if (!isConnected) {
    await showHUD("Private Internet Access disconnected");
  }
}

function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function mapRegionsToDisplayObjects(regions: string[]): Region[] {
  return regions.map((region) => {
    let words = region.split("-");
    words = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    if (words[0].length === 2) {
      words[0] = words[0].toUpperCase();
    }
    const title = words.join(" ");
    return {
      name: region,
      title,
    };
  });
}
