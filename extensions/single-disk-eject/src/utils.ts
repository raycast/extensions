import util from "util";
import child_process from "child_process";
import os from "os";
import path from "path";
import { showToast, Toast, getPreferenceValues, environment } from "@raycast/api";

import { Volume, Preferences } from "./types";

const exec = util.promisify(child_process.exec);
const execFile = util.promisify(child_process.execFile);

/**
 * List all currently-mounted volumes
 */
export async function listVolumes(): Promise<Volume[]> {
  switch (os.platform()) {
    case "darwin":
      return listVolumesMac();

    case "win32":
      return listVolumesWindows();

    default:
      throw new Error("Unsupported environment");
  }
}

async function listVolumesMac(): Promise<Volume[]> {
  const exePath = "ls /Volumes";
  const options = {
    timeout: 0,
  };

  let volumes: Volume[] = [];
  try {
    const { stderr, stdout } = await exec(exePath, options);
    volumes = getVolumesFromLsCommandMac(stdout);
  } catch (e: any) {
    console.log(e.message);
    showToast({ style: Toast.Style.Failure, title: "Error listing volumes", message: e.message });
  }

  return volumes;
}

function getVolumesFromLsCommandMac(raw: string): Volume[] {
  const replacementChars = "~~~~~~~~~";
  const updatedRaw = raw.replace(/\n/g, replacementChars);
  const prefs = getPreferenceValues<Preferences>();
  const volumesToIgnore = prefs?.ignoredVolumes?.split(",");

  const parts = updatedRaw.split(replacementChars);
  let volumes: Volume[] = parts
    .map((p) => ({
      name: p,
    }))
    .filter((v) => v.name !== "")
    .filter((v) => !v.name.includes("TimeMachine.localsnapshots"));

  if (volumesToIgnore != null) {
    volumes = volumes.filter((v) => volumesToIgnore.findIndex((vol) => vol === v.name) < 0);
  }

  return volumes;
}

async function listVolumesWindows(): Promise<Volume[]> {
  let volumes: Volume[] = [];
  try {
    // Use wmic to list removable drives (DriveType=2)
    const { stdout } = await exec('wmic logicaldisk where "drivetype=2" get deviceid,volumename /format:csv', {
      timeout: 10000,
      windowsHide: true, // Prevents console handle from interfering with event loop
    });

    volumes = getVolumesFromWmicWindows(stdout);
  } catch (e: any) {
    console.log(e.message);
    showToast({ style: Toast.Style.Failure, title: "Error listing volumes", message: e.message });
  }

  return volumes;
}

function getVolumesFromWmicWindows(raw: string): Volume[] {
  const prefs = getPreferenceValues<Preferences>();
  const volumesToIgnore = prefs?.ignoredVolumes?.split(",").map((v) => v.trim());

  try {
    // Parse CSV output from wmic
    // Format is: Node,DeviceID,VolumeName
    const lines = raw
      .trim()
      .split("\r\r\n")
      .slice(1) // Skip header line (Node,DeviceID,VolumeName)
      .filter((line) => line.trim() !== "");

    let volumes: Volume[] = lines
      .map((line) => {
        const parts = line.split(",");
        if (parts.length < 2) return null;

        const driveLetter = parts[1]?.trim(); // DeviceID (e.g., "E:")
        const rawLabel = parts[2]?.trim() || ""; // VolumeName

        if (!driveLetter) return null;

        // Handle empty labels (some USBs have no name)
        const label = rawLabel && rawLabel.length > 0 ? rawLabel : "Removable Drive";

        // Format as "E: (Backup Stick)" or "E: (Removable Drive)"
        const name = `${driveLetter} (${label})`;
        return { name };
      })
      .filter((v): v is Volume => v !== null);

    // Apply ignored volumes filter
    if (volumesToIgnore != null && volumesToIgnore.length > 0) {
      volumes = volumes.filter((v) => !volumesToIgnore.some((ignored) => v.name.includes(ignored)));
    }

    return volumes;
  } catch (e: any) {
    console.log("Error parsing wmic output:", e.message);
    return [];
  }
}

/**
 * Given the name of a mounted volume, safely ejects that volume
 * Very much based on the node-eject-media package, updated for
 * more modern JS
 * https://github.com/jayalfredprufrock/node-eject-media/blob/master/index.js
 */
export async function ejectVolume(volume: Volume): Promise<void> {
  switch (os.platform()) {
    case "darwin":
      await ejectVolumeMac(volume);
      break;

    case "win32":
      await ejectVolumeWindows(volume);
      break;

    default:
      throw new Error("Unsupported environment");
  }
}

async function ejectVolumeMac(volume: Volume): Promise<void> {
  // NOTE: Timeout of 0 should mean that it will wait infinitely
  const options = { timeout: 0 };
  const exePath = '/usr/sbin/diskutil eject "' + volume.name + '"';

  // NOTE: This could potentially let an error go through, however the calling function
  // should handle it, and show toasts appropriately
  await exec(exePath, options);
}

async function ejectVolumeWindows(volume: Volume): Promise<void> {
  // Extract drive letter from volume name (e.g., "Backup Stick (E:)" -> "E")
  // The format is now "Label (Drive:)" so we need to extract from the parentheses
  const match = volume.name.match(/\(([A-Z]):?\)/i);
  const driveLetter = match ? match[1] : volume.name.split(":")[0];

  // Path to PowerShell script in the assets folder using Raycast environment
  const scriptPath = path.join(environment.assetsPath, "eject.ps1");

  // Use execFile for security - prevents command injection by passing arguments as array
  // This is safer than exec() which uses shell string interpolation
  await execFile(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-DriveLetter", driveLetter],
    { timeout: 10000, windowsHide: true }, // Prevents console handle from interfering with event loop
  );
}
