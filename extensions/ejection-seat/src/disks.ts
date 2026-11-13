// Pure parsing for the disk topology: no I/O, so tests/disks.test.ts can feed it
// captured command output.

export type Mount = {
  name: string;
  mountPoint: string;
  // Mounted with `nobrowse`: Finder hides it, and so do we — unless it shares a
  // physical disk with a visible volume, in which case it is scanned as a sibling.
  hidden: boolean;
};

export type Volume = Mount & {
  // Every other mount under /Volumes on the same physical disk. `diskutil eject`
  // ejects the whole disk, so a reference on any of these vetoes the eject too.
  siblings: Mount[];
};

// `mount` prints `<device> on <mount point> (<flags>)`. A mount point may itself end
// in a parenthesized suffix ("Disk (2)"), so anchor on the LAST group, whose flags
// never contain parentheses.
const MOUNT_LINE = /^.*? on (.*) \(([^()]*)\)$/;

export function parseNobrowseMounts(mountOutput: string): Set<string> {
  const hidden = new Set<string>();

  for (const line of mountOutput.split("\n")) {
    const match = MOUNT_LINE.exec(line);
    if (match && match[2].split(", ").includes("nobrowse")) hidden.add(match[1]);
  }

  return hidden;
}

type DiskutilEntry = {
  DeviceIdentifier: string;
  MountPoint?: string;
  Partitions?: { DeviceIdentifier?: string; MountPoint?: string }[];
  APFSVolumes?: { DeviceIdentifier?: string; MountPoint?: string }[];
  APFSPhysicalStores?: { DeviceIdentifier: string }[];
};

function wholeDisk(identifier: string): string {
  return /^disk\d+/.exec(identifier)?.[0] ?? identifier;
}

// Maps each mount point to the physical whole disk `diskutil eject` would eject, from
// `diskutil list -plist` converted to JSON. An APFS volume lives on a synthesized
// container (disk10), which in turn lives on a partition of the physical disk
// (disk7s2 -> disk7); a plain partition maps directly.
export function parsePhysicalDisks(listing: { AllDisksAndPartitions?: DiskutilEntry[] }): Map<string, string> {
  const disks = new Map<string, string>();

  for (const entry of listing.AllDisksAndPartitions ?? []) {
    const store = entry.APFSPhysicalStores?.[0]?.DeviceIdentifier;
    const disk = wholeDisk(store ?? entry.DeviceIdentifier);

    for (const mountPoint of [
      entry.MountPoint,
      ...(entry.Partitions ?? []).map((partition) => partition.MountPoint),
      ...(entry.APFSVolumes ?? []).map((volume) => volume.MountPoint),
    ]) {
      if (mountPoint) disks.set(mountPoint, disk);
    }
  }

  return disks;
}

// Siblings come only from the /Volumes mounts passed in, never from the full mount
// table: an internal volume's disk also carries / and /System/Volumes/Data, and lsof
// must never be pointed at the startup disk.
export function groupVolumes(mounts: Mount[], disks: Map<string, string>): Volume[] {
  return mounts
    .filter((mount) => !mount.hidden)
    .map((mount) => {
      const disk = disks.get(mount.mountPoint);
      const siblings = disk ? mounts.filter((other) => other !== mount && disks.get(other.mountPoint) === disk) : [];
      return { ...mount, siblings };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
