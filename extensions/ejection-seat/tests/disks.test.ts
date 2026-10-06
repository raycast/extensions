import { test } from "node:test";
import assert from "node:assert/strict";
import { groupVolumes, parseNobrowseMounts, parsePhysicalDisks, type Mount } from "../src/disks.ts";

// Shapes copied from `/sbin/mount` on macOS 27, volume names changed.
const MOUNT_OUTPUT = [
  "/dev/disk2s1s1 on / (apfs, sealed, local, read-only, journaled)",
  "/dev/disk2s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse, protect, root data)",
  "/dev/disk2s3 on /Volumes/Recovery (apfs, local, journaled, nobrowse)",
  "/dev/disk10s2 on /Volumes/Backup (apfs, local, journaled)",
  "/dev/disk10s3 on /Volumes/Preboot (apfs, local, journaled, nobrowse)",
  "/dev/disk6s1 on /Volumes/MIC CARD (msdos, local, nodev, nosuid, noowners, noatime, fskit)",
  "/dev/disk12s1 on /Volumes/Photos (2) (apfs, local, journaled)",
  "/dev/disk14s1 on /Volumes/Sign on Here (apfs, local, nobrowse, journaled)",
  "/dev/disk5s1 on /Library/Developer/CoreSimulator/Volumes/iOS_23E254a (apfs, sealed, local, read-only, nobrowse)",
  "map auto_home on /System/Volumes/Data/home (autofs, automounted, nobrowse)",
  "",
].join("\n");

// Shape of `diskutil list -plist | plutil -convert json`, trimmed to the keys read.
const DISK_LISTING = {
  AllDisksAndPartitions: [
    { DeviceIdentifier: "disk0", Partitions: [{ DeviceIdentifier: "disk0s2" }] },
    {
      DeviceIdentifier: "disk2",
      APFSPhysicalStores: [{ DeviceIdentifier: "disk0s2" }],
      APFSVolumes: [{ MountPoint: "/" }, { MountPoint: "/System/Volumes/Data" }, { MountPoint: "/Volumes/Recovery" }],
    },
    { DeviceIdentifier: "disk7", Partitions: [{ DeviceIdentifier: "disk7s1" }, { DeviceIdentifier: "disk7s2" }] },
    {
      DeviceIdentifier: "disk10",
      APFSPhysicalStores: [{ DeviceIdentifier: "disk7s2" }],
      APFSVolumes: [{ MountPoint: "/Volumes/Backup" }, { MountPoint: "/Volumes/Preboot" }, {}],
    },
    { DeviceIdentifier: "disk6", Partitions: [{ MountPoint: "/Volumes/MIC CARD" }] },
    // A disk image with no partition map mounts the whole disk directly.
    { DeviceIdentifier: "disk20", MountPoint: "/Volumes/Installer" },
    {
      DeviceIdentifier: "disk12",
      APFSPhysicalStores: [{ DeviceIdentifier: "disk11s2" }],
      APFSVolumes: [{ MountPoint: "/Volumes/Photos (2)" }],
    },
  ],
};

test("parseNobrowseMounts keeps only nobrowse mount points, whole", () => {
  assert.deepEqual(
    [...parseNobrowseMounts(MOUNT_OUTPUT)].sort(),
    [
      "/Library/Developer/CoreSimulator/Volumes/iOS_23E254a",
      "/System/Volumes/Data",
      "/System/Volumes/Data/home",
      "/Volumes/Preboot",
      "/Volumes/Recovery",
      "/Volumes/Sign on Here",
    ].sort(),
  );
});

test("parseNobrowseMounts keeps a parenthesized volume name intact", () => {
  const hidden = parseNobrowseMounts("/dev/disk9s1 on /Volumes/Photos (2) (apfs, local, nobrowse)\n");
  assert.deepEqual([...hidden], ["/Volumes/Photos (2)"]);
});

test("parseNobrowseMounts ignores lines it cannot read", () => {
  assert.equal(parseNobrowseMounts("garbage\n\nnot a mount line\n").size, 0);
});

test("parsePhysicalDisks maps APFS volumes through their container to the physical disk", () => {
  const disks = parsePhysicalDisks(DISK_LISTING);
  assert.equal(disks.get("/Volumes/Backup"), "disk7");
  assert.equal(disks.get("/Volumes/Preboot"), "disk7");
  assert.equal(disks.get("/Volumes/Recovery"), "disk0");
  assert.equal(disks.get("/"), "disk0");
  assert.equal(disks.get("/Volumes/Photos (2)"), "disk11");
});

test("parsePhysicalDisks maps plain partitions and whole-disk mounts directly", () => {
  const disks = parsePhysicalDisks(DISK_LISTING);
  assert.equal(disks.get("/Volumes/MIC CARD"), "disk6");
  assert.equal(disks.get("/Volumes/Installer"), "disk20");
});

test("parsePhysicalDisks tolerates an empty listing", () => {
  assert.equal(parsePhysicalDisks({}).size, 0);
});

const mount = (name: string, hidden = false): Mount => ({ name, mountPoint: `/Volumes/${name}`, hidden });

test("groupVolumes hides nobrowse mounts but keeps them as siblings", () => {
  const volumes = groupVolumes(
    [mount("Backup"), mount("Preboot", true), mount("Recovery", true), mount("MIC CARD")],
    parsePhysicalDisks(DISK_LISTING),
  );

  assert.deepEqual(
    volumes.map((volume) => volume.name),
    ["Backup", "MIC CARD"],
  );
  assert.deepEqual(
    volumes[0].siblings.map((sibling) => sibling.name),
    ["Preboot"],
  );
  assert.deepEqual(volumes[1].siblings, []);
});

test("groupVolumes never takes a sibling from outside the mounts it is given", () => {
  // Recovery shares disk0 with / and /System/Volumes/Data; only /Volumes mounts count.
  const [recovery] = groupVolumes([mount("Recovery")], parsePhysicalDisks(DISK_LISTING));
  assert.deepEqual(recovery.siblings, []);
});

test("groupVolumes scans each volume alone when the topology is unknown", () => {
  const volumes = groupVolumes([mount("Backup"), mount("Preboot")], new Map());
  assert.ok(volumes.every((volume) => volume.siblings.length === 0));
});
