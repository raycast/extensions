import { describe, expect, it } from "vitest";

import { parseDiskStorage, physicalStoreDevice } from "../lib/disk-info";

// Captured from real `df -kP` output (2026-08-04) with an external APFS SSD
// mounted; system volumes and non-disk filesystems included as macOS reports
// them.
const DF_OUTPUT = `Filesystem     1024-blocks      Used Available Capacity  Mounted on
/dev/disk3s3s1   482797652  16243052  35821268    32%    /
devfs                  205       205         0   100%    /dev
/dev/disk3s6     482797652   1048620  35821268     3%    /System/Volumes/VM
/dev/disk3s4     482797652  24255944  35821268    41%    /System/Volumes/Preboot
/dev/disk3s2     482797652    913216  35821268     3%    /System/Volumes/Update
/dev/disk3s1     482797652 401411924  35821268    92%    /System/Volumes/Data
map auto_home            0         0         0   100%    /System/Volumes/Data/home
/dev/disk3s5     482797652   2947012  35821268     8%    /Volumes/Recovery
/dev/disk5s1     976490576 250167000 253203000    26%    /Volumes/DagninBackup
`;

describe("parseDiskStorage", () => {
  it("lists the boot volume and mounted /Volumes entries only", () => {
    const disks = parseDiskStorage(DF_OUTPUT);
    expect(disks.map((d) => d.diskName)).toEqual(["Macintosh HD", "DagninBackup"]);
  });

  it("filters the Recovery system volume, whose numbers duplicate the boot container", () => {
    const disks = parseDiskStorage(DF_OUTPUT);
    expect(disks.find((d) => d.diskName === "Recovery")).toBeUndefined();
  });

  it("flags volumes on a different device than the boot volume as external", () => {
    const disks = parseDiskStorage(DF_OUTPUT);
    expect(disks.find((d) => d.diskName === "Macintosh HD")?.isExternal).toBe(false);
    expect(disks.find((d) => d.diskName === "DagninBackup")?.isExternal).toBe(true);
  });

  it("converts capacities from kilobytes to gigabytes", () => {
    const backup = parseDiskStorage(DF_OUTPUT).find((d) => d.diskName === "DagninBackup");
    expect(backup?.totalSize).toBe("931.25");
    expect(backup?.totalAvailableStorage).toBe("241.47");
    expect(backup?.usedStorage).toBe("689.78");
  });
});

describe("physicalStoreDevice", () => {
  it("derives the physical disk from APFS store identifiers", () => {
    expect(physicalStoreDevice("disk3s1")).toBe("disk3");
    expect(physicalStoreDevice("disk0s2")).toBe("disk0");
  });

  it("returns null when parsing fails", () => {
    expect(physicalStoreDevice("Unknown")).toBeNull();
  });
});
