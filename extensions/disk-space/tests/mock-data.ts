import { StorageDrive, StorageOverview, DriveCategory, DriveHealthStatus, MediaType } from "../src/types/storage";

/**
 * Realistic Mock Storage Drive Fixtures across diverse hardware and OS topologies.
 */

// 1. Primary Windows System NVMe SSD (C: Drive)
export const MOCK_NVME_SSD: StorageDrive = {
  id: "drive-C",
  mountPoint: "C:\\",
  volumeName: "Windows",
  displayName: "Windows (C:)",
  driveLetter: "C:",
  category: "internal",
  driveTypeDescription: "Internal NVMe SSD",
  fileSystem: "NTFS",
  totalBytes: 1_000_204_886_016, // ~931.5 GB
  usedBytes: 650_133_175_910,   // ~605.5 GB (~65.0%)
  freeBytes: 350_071_710_106,   // ~326.0 GB
  usagePercent: 65.0,
  healthStatus: "Healthy",
  busType: "NVMe",
  mediaType: "SSD",
  model: "Samsung SSD 980 PRO 1TB",
  isReadOnly: false,
  isSystemDrive: true,
  isRemovable: false,
  isBitLockerEncrypted: false,
  diskNumber: 0,
  partitionNumber: 3,
};

// 2. High-Capacity Secondary SATA HDD (D: Drive - Warning threshold at 82%)
export const MOCK_SATA_HDD: StorageDrive = {
  id: "drive-D",
  mountPoint: "D:\\",
  volumeName: "Data",
  displayName: "Data (D:)",
  driveLetter: "D:",
  category: "internal",
  driveTypeDescription: "Internal SATA HDD",
  fileSystem: "NTFS",
  totalBytes: 4_000_787_030_016, // ~3.64 TB
  usedBytes: 3_280_645_364_613, // ~2.98 TB (82.0%)
  freeBytes: 720_141_665_403,   // ~670.7 GB
  usagePercent: 82.0,
  healthStatus: "Warning",
  busType: "SATA",
  mediaType: "HDD",
  model: "WDC WD40EZAZ-00SF3B0",
  isReadOnly: false,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: false,
  diskNumber: 1,
  partitionNumber: 1,
};

// 3. Removable USB 3.0 Flash Drive (E: Drive - Critical Space at 92%)
export const MOCK_USB_FLASH: StorageDrive = {
  id: "drive-E",
  mountPoint: "E:\\",
  volumeName: "SANDISK_64",
  displayName: "SANDISK_64 (E:)",
  driveLetter: "E:",
  category: "removable",
  driveTypeDescription: "Removable USB Drive",
  fileSystem: "exFAT",
  totalBytes: 62_410_752_000, // ~58.1 GB
  usedBytes: 57_417_891_840,  // ~53.5 GB (92.0%)
  freeBytes: 4_992_860_160,   // ~4.65 GB
  usagePercent: 92.0,
  healthStatus: "Healthy",
  busType: "USB",
  mediaType: "SSD",
  model: "SanDisk Ultra USB 3.0",
  isReadOnly: false,
  isSystemDrive: false,
  isRemovable: true,
  isBitLockerEncrypted: false,
  diskNumber: 2,
  partitionNumber: 1,
};

// 4. BitLocker Encrypted Locked Partition (F: Drive)
export const MOCK_BITLOCKER_LOCKED: StorageDrive = {
  id: "drive-F",
  mountPoint: "F:\\",
  volumeName: "Secure Vault",
  displayName: "Secure Vault (F:)",
  driveLetter: "F:",
  category: "internal",
  driveTypeDescription: "BitLocker Encrypted Volume",
  fileSystem: "BitLocker",
  totalBytes: 500_107_862_016, // ~465.8 GB
  usedBytes: 0,
  freeBytes: 0,
  usagePercent: 0.0,
  healthStatus: "Unknown",
  busType: "NVMe",
  mediaType: "SSD",
  model: "Samsung SSD 970 EVO Plus 500GB",
  isReadOnly: true,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: true,
  diskNumber: 0,
  partitionNumber: 4,
};

// 5. Offline Network Share (Z: Drive SMB Share)
export const MOCK_OFFLINE_SMB: StorageDrive = {
  id: "drive-Z",
  mountPoint: "Z:\\",
  volumeName: "Shared Backup",
  displayName: "Shared Backup (Z:)",
  driveLetter: "Z:",
  category: "network",
  driveTypeDescription: "Network Share (SMB/NFS)",
  fileSystem: "SMB",
  totalBytes: 10_995_116_277_760, // ~10 TB
  usedBytes: 0,
  freeBytes: 0,
  usagePercent: 0.0,
  healthStatus: "Unknown",
  mediaType: "NetworkShare",
  isReadOnly: false,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: false,
  networkPath: "\\\\nas.corp.local\\backup",
};

// 6. Empty Optical Drive (G: DVD-RW with no disc)
export const MOCK_EMPTY_OPTICAL: StorageDrive = {
  id: "drive-G",
  mountPoint: "G:\\",
  volumeName: "Optical Disc",
  displayName: "Optical Disc (G:)",
  driveLetter: "G:",
  category: "optical",
  driveTypeDescription: "Optical CD/DVD Disc",
  fileSystem: "Unknown",
  totalBytes: 0,
  usedBytes: 0,
  freeBytes: 0,
  usagePercent: 0.0,
  healthStatus: "Unknown",
  busType: "ATAPI",
  mediaType: "Unspecified",
  model: "HL-DT-ST DVDRAM GUE1N",
  isReadOnly: true,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: false,
};

// 7. Unicode Volume Label External Drive (H: "💾 Backup_2026")
export const MOCK_UNICODE_DRIVE: StorageDrive = {
  id: "drive-H",
  mountPoint: "H:\\",
  volumeName: "💾 Backup_2026",
  displayName: "💾 Backup_2026 (H:)",
  driveLetter: "H:",
  category: "removable",
  driveTypeDescription: "Removable USB Drive",
  fileSystem: "NTFS",
  totalBytes: 2_000_398_934_016, // ~1.82 TB
  usedBytes: 700_139_626_905,   // ~652.0 GB (35.0%)
  freeBytes: 1_300_259_307_111, // ~1.21 TB
  usagePercent: 35.0,
  healthStatus: "Healthy",
  busType: "USB",
  mediaType: "HDD",
  model: "Seagate Backup Plus 2TB",
  isReadOnly: false,
  isSystemDrive: false,
  isRemovable: true,
  isBitLockerEncrypted: false,
  diskNumber: 3,
  partitionNumber: 1,
};

// 8. Critical 95.8% Full High-Capacity System Drive
export const MOCK_CRITICAL_DRIVE: StorageDrive = {
  id: "drive-C-critical",
  mountPoint: "C:\\",
  volumeName: "System Disk",
  displayName: "System Disk (C:)",
  driveLetter: "C:",
  category: "internal",
  driveTypeDescription: "Internal NVMe SSD",
  fileSystem: "NTFS",
  totalBytes: 512_110_190_592, // ~476.9 GB
  usedBytes: 490_601_562_587,  // ~456.9 GB (95.8%)
  freeBytes: 21_508_628_005,   // ~20.0 GB
  usagePercent: 95.8,
  healthStatus: "Critical",
  busType: "NVMe",
  mediaType: "SSD",
  model: "Crucial P5 Plus 500GB",
  isReadOnly: false,
  isSystemDrive: true,
  isRemovable: false,
  isBitLockerEncrypted: false,
  diskNumber: 0,
  partitionNumber: 2,
};

// 9. macOS Primary APFS Container Root (Macintosh HD)
export const MOCK_MACOS_APFS_SYSTEM: StorageDrive = {
  id: "drive-macos-root",
  mountPoint: "/",
  volumeName: "Macintosh HD",
  displayName: "Macintosh HD [/]",
  category: "internal",
  driveTypeDescription: "Internal Apple SSD (APFS)",
  fileSystem: "APFS",
  totalBytes: 994_662_584_320, // ~926.3 GB
  usedBytes: 450_210_000_000,  // ~419.3 GB (45.3%)
  freeBytes: 544_452_584_320,  // ~507.0 GB
  usagePercent: 45.3,
  healthStatus: "Healthy",
  busType: "PCIe",
  mediaType: "SSD",
  model: "APPLE SSD AP1024N",
  isReadOnly: false,
  isSystemDrive: true,
  isRemovable: false,
  isBitLockerEncrypted: false,
};

// 10. Virtual Disk Image (V: VHDX)
export const MOCK_VIRTUAL_VHD: StorageDrive = {
  id: "drive-V",
  mountPoint: "V:\\",
  volumeName: "DevSandbox",
  displayName: "DevSandbox (V:)",
  driveLetter: "V:",
  category: "virtual",
  driveTypeDescription: "Virtual Disk Image",
  fileSystem: "NTFS",
  totalBytes: 274_877_906_944, // 256 GB
  usedBytes: 82_463_372_083,   // ~76.8 GB (30.0%)
  freeBytes: 192_414_534_861,  // ~179.2 GB
  usagePercent: 30.0,
  healthStatus: "Healthy",
  busType: "Virtual",
  mediaType: "SSD",
  model: "Microsoft Virtual Disk",
  isReadOnly: false,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: false,
};

// 11. Read-Only ISO Optical Image / Disc Archive
export const MOCK_READONLY_ARCHIVE: StorageDrive = {
  id: "drive-R",
  mountPoint: "R:\\",
  volumeName: "Win11_24H2_ISO",
  displayName: "Win11_24H2_ISO (R:)",
  driveLetter: "R:",
  category: "virtual",
  driveTypeDescription: "Virtual Optical Disc",
  fileSystem: "UDF",
  totalBytes: 6_442_450_944, // ~6.0 GB
  usedBytes: 6_442_450_944,  // 100.0%
  freeBytes: 0,
  usagePercent: 100.0,
  healthStatus: "Healthy",
  busType: "Virtual",
  mediaType: "Unspecified",
  isReadOnly: true,
  isSystemDrive: false,
  isRemovable: false,
  isBitLockerEncrypted: false,
};

// Standard multi-drive topology set for testing
export const MOCK_ALL_DRIVES: StorageDrive[] = [
  MOCK_NVME_SSD,
  MOCK_SATA_HDD,
  MOCK_USB_FLASH,
  MOCK_BITLOCKER_LOCKED,
  MOCK_OFFLINE_SMB,
  MOCK_EMPTY_OPTICAL,
  MOCK_UNICODE_DRIVE,
];

// Calculated overview for the standard 7-drive mock suite
export const MOCK_STANDARD_OVERVIEW: StorageOverview = {
  totalDrives: 7,
  totalBytes: 18_559_025_741_824,     // Exact sum of total bytes across all 7 drives
  totalUsedBytes: 4_688_336_059_268,  // Sum of used bytes
  totalFreeBytes: 2_375_465_542_780,  // Exact sum of free bytes
  overallUsagePercent: 25.3,          // (4688336059268 / 18559025741824) * 100
  healthyCount: 4,                    // C, E, H, and non-critical
  warningCount: 1,                    // D
  criticalCount: 0,
  primaryDrive: MOCK_NVME_SSD,
};

/**
 * Raw Mock PowerShell CIM JSON output fixture.
 */
export const MOCK_RAW_CIM_JSON = JSON.stringify([
  {
    DriveLetter: "C",
    FileSystemLabel: "Windows",
    FileSystem: "NTFS",
    Size: 1000204886016,
    SizeRemaining: 350071710106,
    DriveType: 3,
    HealthStatus: 0,
    BusType: "NVMe",
    MediaType: "SSD",
    FriendlyName: "Samsung SSD 980 PRO 1TB",
    IsReadOnly: false,
    DiskNumber: 0,
    PartitionNumber: 3,
  },
  {
    DriveLetter: "D",
    FileSystemLabel: "Data",
    FileSystem: "NTFS",
    Size: 4000787030016,
    SizeRemaining: 720141665403,
    DriveType: 3,
    HealthStatus: 1,
    BusType: "SATA",
    MediaType: "HDD",
    FriendlyName: "WDC WD40EZAZ-00SF3B0",
    IsReadOnly: false,
    DiskNumber: 1,
    PartitionNumber: 1,
  },
  {
    DriveLetter: "E",
    FileSystemLabel: "SANDISK_64",
    FileSystem: "exFAT",
    Size: 62410752000,
    SizeRemaining: 4992860160,
    DriveType: 2,
    HealthStatus: 0,
    BusType: "USB",
    MediaType: "SSD",
    FriendlyName: "SanDisk Ultra USB 3.0",
    IsReadOnly: false,
    DiskNumber: 2,
    PartitionNumber: 1,
  },
  {
    DriveLetter: "Z",
    FileSystemLabel: "Shared Backup",
    FileSystem: "SMB",
    Size: 10995116277760,
    SizeRemaining: 0,
    DriveType: 4,
    HealthStatus: 2,
    BusType: "Network",
    ProviderName: "\\\\nas.corp.local\\backup",
  }
]);

/**
 * Raw Mock macOS df -k -P output fixture.
 */
export const MOCK_RAW_DF_OUTPUT = `Filesystem    1024-blocks      Used Available Capacity Mounted on
/dev/disk3s1s1   971350180 439658203 531691977    46% /
/dev/disk3s5     971350180      4096 531691977     1% /System/Volumes/Data
/dev/disk4s1      60948000  56072160   4875840    92% /Volumes/SANDISK_USB
map auto_home            0         0         0   100% /System/Volumes/Data/home
//user@nas/share 10737418240 2147483648 8589934592 20% /Volumes/share
`;
