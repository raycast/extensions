import util from "util";
import child_process from "child_process";
import os from "os";
import { showToast, ToastStyle, getPreferenceValues } from "@raycast/api";

import { Volume, Preferences } from "./types";

const exec = util.promisify(child_process.exec);

/**
 * List all currently-mounted volumes
 */
export async function listVolumes(): Promise<Volume[]> {
  // TODO: Support more environments other than just Mac
  switch (os.platform()) {
    case "darwin":
      return listVolumesMac();

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
    showToast(ToastStyle.Failure, "Error listing volumes", e.message);
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

/**
 * Given the name of a mounted volume, safely ejects that volume
 * Very much based on the node-eject-media package, updated for
 * more modern JS
 * https://github.com/jayalfredprufrock/node-eject-media/blob/master/index.js
 */
export async function ejectVolume(volume: Volume): Promise<void> {
  // NOTE: Timeout of 0 should mean that it will wait infinitely
  const options = {
    timeout: 0,
  };

  let exePath;

  // TODO: Support Windows
  switch (os.platform()) {
    case "darwin":
      exePath = '/usr/sbin/diskutil eject "' + volume.name + '"';
      break;

    case "linux":
      exePath = 'eject -f "' + volume.name + '"* 2>/dev/null || /bin/true';
      break;

    default:
      throw new Error("Unsupported environment");
  }

  // NOTE: This could potentially let an error go through, however the calling function
  // should handle it, and show toasts appropriately
  await exec(exePath, options);
}
