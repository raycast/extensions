/**
 * Fixture templates for synthesized disks.
 *
 * Three "roles" cover the cases the real code handles:
 *  - "whole"     -> a physical whole disk (e.g. disk0)
 *  - "container" -> an APFS Container Scheme (e.g. disk3)
 *  - "volume"    -> an APFS Volume (e.g. disk3s5)
 *  - "partition" -> a non-APFS partition (e.g. disk0s1, EFI)
 *
 * Each helper returns a string in the same shape `diskutil` produces, so the
 * existing DiskParser / plist parser code path is exercised end-to-end.
 */

export type DiskRole = "whole" | "container" | "volume" | "partition";

export interface SynthDisk {
  identifier: string; // e.g. "disk3s5"
  parentWhole: string; // e.g. "disk3"
  role: DiskRole;
  name: string; // VolumeName / IORegistryEntryName
  sizeBytes: number; // raw size
  sizeStr: string; // formatted (e.g. "994.7 GB")
  mounted: boolean;
  mountPoint: string; // "" when not mounted
  removable: boolean;
  internal: boolean;
  // Capacity fields. For whole/container: freeBytes goes to FreeSpace.
  // For APFS volumes: containerSize/containerFree go to APFSContainer* keys,
  // capacityInUse to CapacityInUse.
  freeBytes: number;
  containerSizeBytes: number;
  containerFreeBytes: number;
  capacityInUseBytes: number;
}

const xmlBool = (v: boolean): string => (v ? "<true/>" : "<false/>");

/**
 * Produce a plist XML string mirroring what `diskutil info -plist` returns.
 * Only includes the keys the app actually reads (see Disk.ts / DiskParser).
 */
export function buildPlist(d: SynthDisk): string {
  // Fields that vary by role
  const wholeDisk = d.role === "whole" || d.role === "container";
  const filesystemName = d.role === "volume" ? "APFS" : "";
  const filesystemType = d.role === "volume" ? "apfs" : "";
  const content =
    d.role === "whole"
      ? "GUID_partition_scheme"
      : d.role === "container"
        ? "Apple_APFS"
        : d.role === "volume"
          ? "41504653-0000-11AA-AA11-00306543ECAC"
          : "EFI";

  const apfsKeys =
    d.role === "volume"
      ? `\t<key>APFSContainerFree</key>
\t<integer>${d.containerFreeBytes}</integer>
\t<key>APFSContainerSize</key>
\t<integer>${d.containerSizeBytes}</integer>
\t<key>CapacityInUse</key>
\t<integer>${d.capacityInUseBytes}</integer>
`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${apfsKeys}\t<key>Bootable</key>
\t${xmlBool(d.role !== "partition")}
\t<key>BusProtocol</key>
\t<string>${d.internal ? "Apple Fabric" : "USB"}</string>
\t<key>Content</key>
\t<string>${content}</string>
\t<key>DeviceBlockSize</key>
\t<integer>4096</integer>
\t<key>DeviceIdentifier</key>
\t<string>${d.identifier}</string>
\t<key>DeviceNode</key>
\t<string>/dev/${d.identifier}</string>
\t<key>Ejectable</key>
\t${xmlBool(d.removable)}
\t<key>FilesystemName</key>
\t<string>${filesystemName}</string>
\t<key>FilesystemType</key>
\t<string>${filesystemType}</string>
\t<key>FreeSpace</key>
\t<integer>${d.freeBytes}</integer>
\t<key>IOKitSize</key>
\t<integer>${d.sizeBytes}</integer>
\t<key>IORegistryEntryName</key>
\t<string>${d.name}</string>
\t<key>Internal</key>
\t${xmlBool(d.internal)}
\t<key>MediaName</key>
\t<string></string>
\t<key>MediaType</key>
\t<string>Generic</string>
\t<key>MountPoint</key>
\t<string>${d.mountPoint}</string>
\t<key>ParentWholeDisk</key>
\t<string>${d.parentWhole}</string>
\t<key>Removable</key>
\t${xmlBool(d.removable)}
\t<key>RemovableMedia</key>
\t${xmlBool(d.removable)}
\t<key>SMARTStatus</key>
\t<string>Verified</string>
\t<key>Size</key>
\t<integer>${d.sizeBytes}</integer>
\t<key>SolidState</key>
\t${xmlBool(d.internal)}
\t<key>TotalSize</key>
\t<integer>${d.sizeBytes}</integer>
\t<key>VolumeName</key>
\t<string>${d.role === "volume" ? d.name : ""}</string>
\t<key>VolumeSize</key>
\t<integer>${d.role === "volume" && d.mounted ? d.sizeBytes : 0}</integer>
\t<key>WholeDisk</key>
\t${xmlBool(wholeDisk)}
\t<key>Writable</key>
\t<true/>
\t<key>WritableMedia</key>
\t<true/>
\t<key>WritableVolume</key>
\t${xmlBool(d.mounted)}
</dict>
</plist>
`;
}

/**
 * Produce a plain-text `diskutil info` block. The existing DiskParser only
 * reads `Mounted` from this output, but we render a realistic block so the
 * details view also looks right when the mock is on.
 */
export function buildPlainText(d: SynthDisk): string {
  const mounted = d.role === "volume" ? (d.mounted ? "Yes" : "No") : "Not applicable (no file system)";
  return [
    `Device Identifier:         ${d.identifier}`,
    `Device Node:               /dev/${d.identifier}`,
    `Whole:                     ${d.role === "whole" || d.role === "container" ? "Yes" : "No"}`,
    `Part of Whole:             ${d.parentWhole}`,
    "",
    `Volume Name:               ${d.role === "volume" ? d.name : ""}`,
    `Mounted:                   ${mounted}`,
    `Mount Point:               ${d.mountPoint}`,
    "",
    `File System Personality:   ${d.role === "volume" ? "APFS" : ""}`,
    `Type (Bundle):             ${d.role === "volume" ? "apfs" : ""}`,
    `Name (User Visible):       ${d.role === "volume" ? "APFS" : ""}`,
    "",
    `Disk Size:                 ${d.sizeStr} (${d.sizeBytes} Bytes)`,
    `Device Block Size:         4096 Bytes`,
    "",
    `Device Location:           ${d.internal ? "Internal" : "External"}`,
    `Removable Media:           ${d.removable ? "Removable" : "Fixed"}`,
    "",
    `Solid State:               ${d.internal ? "Yes" : "No"}`,
    "",
  ].join("\n");
}
