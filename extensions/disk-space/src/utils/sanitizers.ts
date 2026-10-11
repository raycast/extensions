import {
  DriveCategory,
  DriveHealthStatus,
  MediaType,
  StorageDrive,
} from "../types/storage";

export interface RawDriveInput {
  id?: string;
  mountPoint?: string;
  volumeName?: string;
  driveLetter?: string;
  category?: DriveCategory;
  driveTypeDescription?: string;
  fileSystem?: string;
  totalBytes?: number | string;
  usedBytes?: number | string;
  freeBytes?: number | string;
  usagePercent?: number;
  healthStatus?: string;
  busType?: string;
  mediaType?: string;
  model?: string;
  isReadOnly?: boolean;
  isSystemDrive?: boolean;
  isRemovable?: boolean;
  isBitLockerEncrypted?: boolean;
  networkPath?: string;
  diskNumber?: number;
  partitionNumber?: number;
}

/**
 * Sanitizes and normalizes raw drive inputs from CIM, WMI, df, or mock data into a resilient StorageDrive.
 */
export function sanitizeDrive(raw: RawDriveInput): StorageDrive {
  // 1. Sanitize Drive Letter & Mount Point
  let driveLetter: string | undefined = undefined;
  if (raw.driveLetter && /^[a-zA-Z]:?$/.test(raw.driveLetter.trim())) {
    driveLetter = raw.driveLetter.trim().toUpperCase();
    if (!driveLetter.endsWith(":")) {
      driveLetter += ":";
    }
  }

  let mountPoint = (raw.mountPoint || "").trim();
  if (!mountPoint && driveLetter) {
    mountPoint = `${driveLetter}\\`;
  }
  if (!mountPoint) {
    mountPoint = raw.id || "Unknown";
  }

  // If driveLetter was not provided but mountPoint is "C:\" or "C:"
  if (!driveLetter && /^[a-zA-Z]:(\\?|\/)?$/.test(mountPoint)) {
    driveLetter = mountPoint.substring(0, 2).toUpperCase();
  }

  // 2. Resolve Category & Media Type & Description
  const category = normalizeCategory(
    raw.category,
    raw.busType,
    raw.isRemovable,
    raw.networkPath,
  );
  const mediaType = normalizeMediaType(raw.mediaType, raw.busType, category);
  const driveTypeDescription =
    raw.driveTypeDescription || getDefaultTypeDescription(category, mediaType);

  // 3. Resolve Volume Name & Display Name
  const volumeName = normalizeVolumeName(raw.volumeName, category, driveLetter);
  const displayName = buildDisplayName(volumeName, driveLetter, mountPoint);

  // 4. Resolve Bytes & Usage
  const totalBytes = parseBytes(raw.totalBytes);
  const freeBytes = parseBytes(raw.freeBytes);
  let usedBytes = parseBytes(raw.usedBytes);

  if (
    usedBytes === 0 &&
    totalBytes > 0 &&
    freeBytes > 0 &&
    freeBytes <= totalBytes
  ) {
    usedBytes = totalBytes - freeBytes;
  }

  let usagePercent = 0;
  if (raw.usagePercent !== undefined && !isNaN(raw.usagePercent)) {
    usagePercent = Math.max(0, Math.min(100, raw.usagePercent));
  } else if (totalBytes > 0) {
    usagePercent = Math.max(
      0,
      Math.min(100, Math.round((usedBytes / totalBytes) * 100 * 10) / 10),
    );
  }

  // 5. Resolve Health Status
  const healthStatus = normalizeHealthStatus(
    raw.healthStatus,
    usagePercent,
    totalBytes,
  );

  // 6. System Drive detection
  const isSystemDrive = Boolean(
    raw.isSystemDrive ||
    (driveLetter === "C:" && process.platform === "win32") ||
    mountPoint === "/" ||
    mountPoint === "/System/Volumes/Data",
  );

  return {
    id:
      raw.id ||
      (driveLetter
        ? `drive-${driveLetter.replace(":", "")}`
        : `drive-${mountPoint.replace(/[^a-zA-Z0-9]/g, "_")}`),
    mountPoint,
    volumeName,
    displayName,
    driveLetter,
    category,
    driveTypeDescription,
    fileSystem: (raw.fileSystem || "Unknown").trim(),
    totalBytes,
    usedBytes,
    freeBytes,
    usagePercent,
    healthStatus,
    busType: raw.busType?.trim() || undefined,
    mediaType,
    model: raw.model?.trim() || undefined,
    isReadOnly: Boolean(raw.isReadOnly),
    isSystemDrive,
    isRemovable: Boolean(raw.isRemovable || category === "removable"),
    isBitLockerEncrypted: Boolean(raw.isBitLockerEncrypted),
    networkPath: raw.networkPath?.trim() || undefined,
    diskNumber: raw.diskNumber,
    partitionNumber: raw.partitionNumber,
  };
}

export function normalizeVolumeName(
  name: string | undefined,
  category: DriveCategory,
  driveLetter?: string,
): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  switch (category) {
    case "internal":
      return driveLetter ? `Local Disk (${driveLetter})` : "Local Disk";
    case "removable":
      return driveLetter ? `Removable Disk (${driveLetter})` : "Removable Disk";
    case "network":
      return "Network Share";
    case "optical":
      return "Optical Disc";
    case "virtual":
      return "Virtual Disk";
    default:
      return driveLetter ? `Drive (${driveLetter})` : "Storage Drive";
  }
}

export function buildDisplayName(
  volumeName: string,
  driveLetter?: string,
  mountPoint?: string,
): string {
  if (driveLetter) {
    if (volumeName.includes(`(${driveLetter})`)) {
      return volumeName;
    }
    return `${volumeName} (${driveLetter})`;
  }
  if (mountPoint && mountPoint !== "Unknown") {
    if (volumeName === mountPoint) return volumeName;
    return `${volumeName} [${mountPoint}]`;
  }
  return volumeName;
}

export function normalizeCategory(
  category?: DriveCategory,
  busType?: string,
  isRemovable?: boolean,
  networkPath?: string,
): DriveCategory {
  if (category) return category;
  if (networkPath && networkPath.length > 0) return "network";
  if (isRemovable) return "removable";
  const bus = (busType || "").toLowerCase();
  if (
    bus.includes("usb") ||
    bus.includes("sd") ||
    bus.includes("1394") ||
    bus.includes("firewire")
  ) {
    return "removable";
  }
  if (bus.includes("iscsi") || bus.includes("network")) {
    return "network";
  }
  if (bus.includes("file") || bus.includes("virtual") || bus.includes("vhd")) {
    return "virtual";
  }
  return "internal";
}

export function normalizeHealthStatus(
  status: string | undefined,
  usagePercent: number,
  totalBytes: number,
): DriveHealthStatus {
  if (!status) {
    if (totalBytes === 0) return "Unknown";
    if (usagePercent >= 90) return "Critical";
    if (usagePercent >= 85) return "Warning";
    return "Healthy";
  }

  const s = status.trim().toLowerCase();
  if (s === "healthy" || s === "ok" || s === "0" || s === "good") {
    if (usagePercent >= 90) return "Critical";
    if (usagePercent >= 85) return "Warning";
    return "Healthy";
  }
  if (
    s === "warning" ||
    s === "degraded" ||
    s === "pred fail" ||
    s === "caution"
  ) {
    return "Warning";
  }
  if (
    s === "critical" ||
    s === "error" ||
    s === "unhealthy" ||
    s === "failed" ||
    s === "bad"
  ) {
    return "Critical";
  }
  return "Unknown";
}

export function normalizeMediaType(
  media?: string,
  busType?: string,
  category?: DriveCategory,
): MediaType {
  if (category === "network") return "NetworkShare";
  const m = (media || "").toLowerCase();
  if (
    m.includes("ssd") ||
    m.includes("nvme") ||
    m.includes("flash") ||
    m.includes("solid state")
  ) {
    return "SSD";
  }
  if (
    m.includes("hdd") ||
    m.includes("hard disk") ||
    m.includes("platter") ||
    m.includes("magnetic")
  ) {
    return "HDD";
  }
  if (m.includes("scm")) {
    return "SCM";
  }
  const bus = (busType || "").toLowerCase();
  if (bus.includes("nvme")) {
    return "SSD";
  }
  return "Unspecified";
}

export function parseBytes(val: number | string | undefined): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") {
    return isNaN(val) || !isFinite(val) || val < 0 ? 0 : val;
  }
  const parsed = Number(val);
  return isNaN(parsed) || !isFinite(parsed) || parsed < 0 ? 0 : parsed;
}

export function getDefaultTypeDescription(
  category: DriveCategory,
  mediaType?: MediaType,
): string {
  switch (category) {
    case "internal":
      return mediaType === "SSD"
        ? "Internal SSD"
        : mediaType === "HDD"
          ? "Internal HDD"
          : "Internal Drive";
    case "removable":
      return "Removable USB Drive";
    case "network":
      return "Network Share (SMB/NFS)";
    case "virtual":
      return "Virtual Disk Image";
    case "optical":
      return "Optical CD/DVD Disc";
    case "unknown":
    default:
      return "Storage Volume";
  }
}
