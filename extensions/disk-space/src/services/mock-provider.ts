import {
  IStorageProvider,
  StorageDrive,
  StorageOverview,
} from "../types/storage";
import { sanitizeDrive } from "../utils/sanitizers";

export const DEFAULT_MOCK_DRIVES: StorageDrive[] = [
  sanitizeDrive({
    id: "drive-C",
    driveLetter: "C:",
    mountPoint: "C:\\",
    volumeName: "Windows System",
    category: "internal",
    driveTypeDescription: "Internal NVMe SSD",
    fileSystem: "NTFS",
    totalBytes: 1024 * 1024 * 1024 * 1024, // 1 TB
    usedBytes: 665719930880, // ~620 GB (65%)
    freeBytes: 408024256512, // ~380 GB
    usagePercent: 62.0,
    healthStatus: "Healthy",
    busType: "NVMe",
    mediaType: "SSD",
    model: "Samsung SSD 980 PRO 1TB",
    isReadOnly: false,
    isSystemDrive: true,
    isRemovable: false,
    isBitLockerEncrypted: true,
    diskNumber: 0,
    partitionNumber: 3,
  }),
  sanitizeDrive({
    id: "drive-D",
    driveLetter: "D:",
    mountPoint: "D:\\",
    volumeName: "Data & Games",
    category: "internal",
    driveTypeDescription: "Internal SATA HDD",
    fileSystem: "NTFS",
    totalBytes: 4 * 1024 * 1024 * 1024 * 1024, // 4 TB
    usedBytes: 3869099982848, // ~3.52 TB (88%)
    freeBytes: 525838843904, // ~480 GB
    usagePercent: 88.0,
    healthStatus: "Warning",
    busType: "SATA",
    mediaType: "HDD",
    model: "Seagate BarraCuda 4TB",
    isReadOnly: false,
    isSystemDrive: false,
    isRemovable: false,
    diskNumber: 1,
    partitionNumber: 1,
  }),
  sanitizeDrive({
    id: "drive-E",
    driveLetter: "E:",
    mountPoint: "E:\\",
    volumeName: "Work Projects",
    category: "internal",
    driveTypeDescription: "Internal SSD",
    fileSystem: "NTFS",
    totalBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    usedBytes: 480000000000, // 480 GB (96%)
    freeBytes: 20000000000, // 20 GB
    usagePercent: 96.0,
    healthStatus: "Critical",
    busType: "SATA",
    mediaType: "SSD",
    model: "Crucial MX500 500GB",
    isReadOnly: false,
    isSystemDrive: false,
    isRemovable: false,
    diskNumber: 2,
    partitionNumber: 1,
  }),
  sanitizeDrive({
    id: "drive-F",
    driveLetter: "F:",
    mountPoint: "F:\\",
    volumeName: "KINGSTON",
    category: "removable",
    driveTypeDescription: "Removable USB Flash Drive",
    fileSystem: "exFAT",
    totalBytes: 64 * 1024 * 1024 * 1024, // 64 GB
    usedBytes: 25600000000, // 25.6 GB (40%)
    freeBytes: 38400000000, // 38.4 GB
    usagePercent: 40.0,
    healthStatus: "Healthy",
    busType: "USB",
    mediaType: "SSD",
    model: "Kingston DataTraveler 3.0",
    isReadOnly: false,
    isSystemDrive: false,
    isRemovable: true,
    diskNumber: 3,
    partitionNumber: 1,
  }),
  sanitizeDrive({
    id: "drive-Z",
    driveLetter: "Z:",
    mountPoint: "Z:\\",
    volumeName: "Shared Media",
    category: "network",
    driveTypeDescription: "Network Share (SMB)",
    fileSystem: "SMB",
    totalBytes: 12 * 1024 * 1024 * 1024 * 1024, // 12 TB
    usedBytes: 6.6 * 1024 * 1024 * 1024 * 1024, // 6.6 TB (55%)
    freeBytes: 5.4 * 1024 * 1024 * 1024 * 1024,
    usagePercent: 55.0,
    healthStatus: "Healthy",
    busType: "Network",
    mediaType: "NetworkShare",
    networkPath: "\\\\nas.local\\media",
    isReadOnly: false,
    isSystemDrive: false,
    isRemovable: false,
  }),
  sanitizeDrive({
    id: "drive-X",
    driveLetter: "X:",
    mountPoint: "X:\\",
    volumeName: "Offline Backup Share",
    category: "network",
    driveTypeDescription: "Network Share (SMB)",
    fileSystem: "SMB",
    totalBytes: 0,
    usedBytes: 0,
    freeBytes: 0,
    usagePercent: 0,
    healthStatus: "Warning",
    busType: "Network",
    mediaType: "NetworkShare",
    networkPath: "\\\\backup-server.local\\archive",
    isReadOnly: true,
    isSystemDrive: false,
    isRemovable: false,
  }),
  sanitizeDrive({
    id: "drive-G",
    driveLetter: "G:",
    mountPoint: "G:\\",
    volumeName: "Secure Vault",
    category: "removable",
    driveTypeDescription: "BitLocker Encrypted External Drive",
    fileSystem: "NTFS",
    totalBytes: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB
    usedBytes: 500 * 1024 * 1024 * 1024, // 500 GB (25%)
    freeBytes: 1.5 * 1024 * 1024 * 1024 * 1024,
    usagePercent: 25.0,
    healthStatus: "Healthy",
    busType: "USB",
    mediaType: "HDD",
    model: "WD My Passport 2TB",
    isReadOnly: false,
    isSystemDrive: false,
    isRemovable: true,
    isBitLockerEncrypted: true,
  }),
  sanitizeDrive({
    id: "drive-H",
    driveLetter: "H:",
    mountPoint: "H:\\",
    volumeName: "BD-RE Drive",
    category: "optical",
    driveTypeDescription: "Optical Disc Drive (Empty)",
    fileSystem: "UDF",
    totalBytes: 0,
    usedBytes: 0,
    freeBytes: 0,
    usagePercent: 0,
    healthStatus: "Unknown",
    busType: "ATAPI",
    mediaType: "Unspecified",
    isReadOnly: true,
    isSystemDrive: false,
    isRemovable: false,
  }),
];

export class MockStorageProvider implements IStorageProvider {
  public readonly platformName = "Mock";
  private drives: StorageDrive[];

  constructor(initialDrives?: StorageDrive[]) {
    this.drives = initialDrives ? [...initialDrives] : [...DEFAULT_MOCK_DRIVES];
  }

  public setMockDrives(drives: StorageDrive[]): void {
    this.drives = [...drives];
  }

  public resetMockDrives(): void {
    this.drives = [...DEFAULT_MOCK_DRIVES];
  }

  public async getDrives(): Promise<StorageDrive[]> {
    // Return a cloned copy
    return JSON.parse(JSON.stringify(this.drives));
  }

  public async getOverview(): Promise<StorageOverview> {
    const drives = await this.getDrives();
    let totalBytes = 0;
    let totalFreeBytes = 0;
    let totalUsedBytes = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const drive of drives) {
      totalBytes += drive.totalBytes;
      totalFreeBytes += drive.freeBytes;
      totalUsedBytes += drive.usedBytes;

      if (drive.healthStatus === "Healthy") healthyCount++;
      else if (drive.healthStatus === "Warning") warningCount++;
      else if (drive.healthStatus === "Critical") criticalCount++;
    }

    const overallUsagePercent =
      totalBytes > 0
        ? Math.round((totalUsedBytes / totalBytes) * 100 * 10) / 10
        : 0;

    return {
      totalDrives: drives.length,
      totalBytes,
      totalFreeBytes,
      totalUsedBytes,
      overallUsagePercent,
      healthyCount,
      warningCount,
      criticalCount,
      primaryDrive: drives.find((d) => d.isSystemDrive) || drives[0],
    };
  }

  public async ejectDrive(drive: StorageDrive): Promise<boolean> {
    const initialCount = this.drives.length;
    this.drives = this.drives.filter(
      (d) => d.id !== drive.id && d.mountPoint !== drive.mountPoint,
    );
    return this.drives.length < initialCount;
  }
}
