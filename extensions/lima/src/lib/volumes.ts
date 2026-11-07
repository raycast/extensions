import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { volumeNames } from "./instance";
import { LimaDisk, listDisks, listInstances } from "./lima";

/**
 * A Lima disk: storage that outlives the instances it's attached to, like a Docker volume.
 * Deleting an instance leaves its volumes, so their data can go to another one.
 */
export interface Volume extends LimaDisk {
  /** Instances whose configuration attaches it, running or not. */
  attachedTo: string[];
  /** Bytes it takes on this Mac. Volumes are sparse, so this grows as they fill, up to `size`. */
  used: number;
}

async function usedBytes(path: string): Promise<number> {
  let total = 0;
  try {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) total += await usedBytes(full);
      else if (entry.isFile()) total += (await stat(full)).blocks * 512;
    }
  } catch {
    // A volume being deleted can vanish mid-read.
  }
  return total;
}

export async function listVolumes(): Promise<Volume[]> {
  const [disks, instances] = await Promise.all([listDisks(), listInstances()]);
  return Promise.all(
    disks.map(async (disk) => ({
      ...disk,
      attachedTo: instances.filter((instance) => volumeNames(instance).includes(disk.name)).map((i) => i.name),
      used: await usedBytes(disk.dir),
    })),
  );
}

/** In Use while a running instance holds it, Attached while one is only set up to, else Not Attached. */
export function volumeStatus(volume: Volume): string {
  if (volume.instance) return "In Use";
  return volume.attachedTo.length ? "Attached" : "Not Attached";
}
