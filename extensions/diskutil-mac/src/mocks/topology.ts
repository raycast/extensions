import type { SynthDisk } from "./fixtures";
import { makeRng, randInt } from "./rng";

/** A synthesized section that mirrors `/dev/diskN (...):` blocks. */
export interface SynthSection {
  /** e.g. "/dev/disk0 (internal, physical):" */
  header: string;
  /** Whole disk (entry #0) plus children */
  disks: SynthDisk[];
}

/** A static lookup table built once at session start. */
export interface SynthTopology {
  sections: SynthSection[];
  byIdentifier: Map<string, SynthDisk>;
}

const GB = 1024 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * GB) return `${(bytes / (1024 * GB)).toFixed(1)} TB`;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${bytes} B`;
}

const VOLUME_NAMES = [
  "Macintosh HD",
  "Preboot",
  "Recovery",
  "Data",
  "VM",
  "Film HD",
  "VMs HD",
  "Gaming HD",
  "Backup",
  "TimeMachine",
  "Photos",
  "Music",
  "Documents",
  "Projects",
  "Archive",
  "Scratch",
  "Cache",
  "Downloads",
  "External",
  "Vault",
];

/**
 * Build a topology of `diskCount` synthesized disks spread across `sectionCount`
 * top-level sections. Each section is either:
 *  - internal physical: a whole disk + a few EFI/recovery partitions
 *  - synthesized APFS:  a container + many volumes
 *  - external physical: a whole disk + a few partitions, marked removable
 *
 * Distribution is deterministic given `seed`.
 */
export function buildTopology(diskCount: number, sectionCount: number, seed: number): SynthTopology {
  const rng = makeRng(seed);
  const sections: SynthSection[] = [];
  const byIdentifier = new Map<string, SynthDisk>();

  // Allocate how many disks each section gets — minimum 2 (whole + 1 child),
  // remainder distributed roughly evenly.
  const sectionCounts: number[] = new Array(sectionCount).fill(2);
  let remaining = Math.max(0, diskCount - sectionCount * 2);
  let idx = 0;
  while (remaining > 0) {
    sectionCounts[idx % sectionCount]++;
    remaining--;
    idx++;
  }

  for (let s = 0; s < sectionCount; s++) {
    // Choose section kind: alternate between physical/synthesized/external
    const kind = s === 0 ? "physical" : s % 3 === 1 ? "synthesized" : "external";
    const diskNum = s === 0 ? 0 : s + 2; // disk0, disk3, disk4, ...
    const wholeId = `disk${diskNum}`;
    const headerSuffix =
      kind === "physical"
        ? "(internal, physical):"
        : kind === "synthesized"
          ? "(synthesized):"
          : "(external, physical):";
    const header = `/dev/${wholeId} ${headerSuffix}`;

    const totalSize = kind === "synthesized" ? randInt(rng, 500, 2000) * GB : randInt(rng, 256, 4000) * GB;
    const isInternal = kind !== "external";
    const isRemovable = kind === "external";
    const containerFree = Math.floor(totalSize * (0.05 + rng() * 0.45));

    const whole: SynthDisk = {
      identifier: wholeId,
      parentWhole: wholeId,
      role: kind === "synthesized" ? "container" : "whole",
      name: kind === "synthesized" ? "Container" : isRemovable ? "External Drive" : "Internal Drive",
      sizeBytes: totalSize,
      sizeStr: formatSize(totalSize),
      mounted: false,
      mountPoint: "",
      removable: isRemovable,
      internal: isInternal,
      freeBytes: kind === "synthesized" ? containerFree : 0, // whole disks have no FS → 0
      containerSizeBytes: 0,
      containerFreeBytes: 0,
      capacityInUseBytes: 0,
    };

    const disks: SynthDisk[] = [whole];
    const childCount = sectionCounts[s] - 1;

    for (let c = 1; c <= childCount; c++) {
      const childId = `${wholeId}s${c}`;
      const role: "volume" | "partition" = kind === "synthesized" ? "volume" : "partition";
      const childSize = Math.floor(totalSize / Math.max(1, childCount + 2)) + randInt(rng, 0, GB);
      const name =
        role === "volume" ? VOLUME_NAMES[randInt(rng, 0, VOLUME_NAMES.length - 1)] : c === 1 ? "EFI" : `Part ${c}`;
      const mounted = role === "volume" && rng() > 0.4;
      // For APFS volumes: capacityInUse is a 10–90% slice of this volume's nominal size.
      const capacityInUse = role === "volume" ? Math.floor(childSize * (0.1 + rng() * 0.8)) : 0;
      const child: SynthDisk = {
        identifier: childId,
        parentWhole: wholeId,
        role,
        name,
        sizeBytes: childSize,
        sizeStr: formatSize(childSize),
        mounted,
        mountPoint: mounted ? `/Volumes/${name}` : "",
        removable: isRemovable,
        internal: isInternal,
        freeBytes: 0,
        containerSizeBytes: role === "volume" ? totalSize : 0,
        containerFreeBytes: role === "volume" ? containerFree : 0,
        capacityInUseBytes: capacityInUse,
      };
      disks.push(child);
    }

    sections.push({ header, disks });
    for (const d of disks) byIdentifier.set(d.identifier, d);
  }

  return { sections, byIdentifier };
}

/**
 * Render the topology into the exact text format `diskutil list` produces.
 * The existing parseDiskSections regex consumes this directly.
 */
export function renderDiskutilList(topology: SynthTopology): string {
  const parts: string[] = [];
  for (const section of topology.sections) {
    parts.push(section.header);
    parts.push("   #:                       TYPE NAME                    SIZE       IDENTIFIER");
    section.disks.forEach((d, i) => {
      // The DiskParser regex expects fixed columns; build them carefully.
      const typeStr = formatType(d);
      const nameStr = (d.role === "container" ? `Container ${d.parentWhole}` : d.name).padEnd(23).slice(0, 23);
      const sizePrefix = d.role === "whole" || d.role === "container" ? (i === 0 ? "*" : "+") : " ";
      const sizeStr = `${sizePrefix}${d.sizeStr}`.padEnd(10).slice(0, 10);
      parts.push(`   ${i}: ${typeStr.padStart(26)} ${nameStr} ${sizeStr} ${d.identifier}`);
    });
    parts.push("");
  }
  return parts.join("\n");
}

function formatType(d: { role: string }): string {
  switch (d.role) {
    case "whole":
      return "GUID_partition_scheme";
    case "container":
      return "APFS Container Scheme";
    case "volume":
      return "APFS Volume";
    case "partition":
    default:
      return "EFI";
  }
}
