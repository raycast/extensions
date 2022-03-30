import util from "util";
import child_process from "child_process";
import os from "os";
import { showToast, ToastStyle } from "@raycast/api";

import { Volume } from "./types";

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
    timeout: 5000,
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

  const parts = updatedRaw.split(replacementChars);
  const volumes: Volume[] = parts
    .map((p) => ({
      name: p,
    }))
    .filter((v) => v.name !== "")
    .filter((v) => !v.name.includes("TimeMachine.localsnapshots"));

  return volumes;
}

/**
 * Given the name of a mounted volume, safely ejects that volume
 * Very much based on the node-eject-media package, updated for
 * more modern JS
 * https://github.com/jayalfredprufrock/node-eject-media/blob/master/index.js
 */
export async function ejectVolume(volume: Volume): Promise<void> {
  const options = {
    timeout: 15000,
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

  try {
    const { stdout, stderr } = await exec(exePath, options);
  } catch (e: any) {
    console.log(e.message);
    showToast(ToastStyle.Failure, "Error ejecting volume", e.message);
  }
}
