import {
  IStorageProvider,
  StorageDrive,
  StorageOverview,
} from "../types/storage";
import { runPowerShell, runPowerShellJson } from "./powershell-runner";
import { RawDriveInput, sanitizeDrive } from "../utils/sanitizers";

const WINDOWS_STORAGE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
try {
  $volumes = Get-CimInstance -Namespace ROOT/Microsoft/Windows/Storage -ClassName MSFT_Volume
  $disks = Get-CimInstance -Namespace ROOT/Microsoft/Windows/Storage -ClassName MSFT_PhysicalDisk
  $partitions = Get-CimInstance -Namespace ROOT/Microsoft/Windows/Storage -ClassName MSFT_Partition
  $wmiDrives = Get-CimInstance -ClassName Win32_LogicalDisk

  $diskMap = @{}
  if ($disks) {
    foreach ($d in $disks) {
      $diskMap[[string]$d.DeviceId] = @{
        Model = [string]$d.FriendlyName
        MediaType = switch ($d.MediaType) { 3 {'HDD'} 4 {'SSD'} 5 {'SCM'} default {'Unspecified'} }
        BusType = switch ($d.BusType) {
          17 {'NVMe'}
          11 {'SATA'}
          7 {'USB'}
          8 {'SCSI'}
          12 {'SAS'}
          10 {'ATAPI'}
          15 {'RAID'}
          16 {'iSCSI'}
          default {'Other'}
        }
        Health = switch ($d.HealthStatus) { 0 {'Healthy'} 1 {'Warning'} 2 {'Critical'} default {'Unknown'} }
      }
    }
  }

  $partDiskMap = @{}
  if ($partitions) {
    foreach ($p in $partitions) {
      if ($p.DriveLetter) {
        $letter = [string]$p.DriveLetter
        $partDiskMap[$letter] = @{
          DiskNumber = $p.DiskNumber
          PartitionNumber = $p.PartitionNumber
        }
      }
    }
  }

  $wmiMap = @{}
  if ($wmiDrives) {
    foreach ($w in $wmiDrives) {
      if ($w.DeviceID) {
        $letterKey = $w.DeviceID.TrimEnd(':')
        $wmiMap[$letterKey] = @{
          DriveType = $w.DriveType
          ProviderName = $w.ProviderName
          VolumeName = $w.VolumeName
          FreeSpace = $w.FreeSpace
          Size = $w.Size
          FileSystem = $w.FileSystem
        }
      }
    }
  }

  $results = @()
  if ($volumes) {
    foreach ($v in $volumes) {
      $letter = if ($v.DriveLetter) { [string]$v.DriveLetter } else { '' }
      $letterKey = $letter.TrimEnd(':')
      
      $wmiInfo = if ($letterKey -and $wmiMap.ContainsKey($letterKey)) { $wmiMap[$letterKey] } else { $null }
      $partInfo = if ($letterKey -and $partDiskMap.ContainsKey($letterKey)) { $partDiskMap[$letterKey] } else { $null }
      $diskInfo = if ($partInfo -and $partInfo.DiskNumber -ne $null -and $diskMap.ContainsKey([string]$partInfo.DiskNumber)) { $diskMap[[string]$partInfo.DiskNumber] } else { $null }

      $total = if ($v.Size) { [int64]$v.Size } elseif ($wmiInfo -and $wmiInfo.Size) { [int64]$wmiInfo.Size } else { 0 }
      $free = if ($v.SizeRemaining) { [int64]$v.SizeRemaining } elseif ($wmiInfo -and $wmiInfo.FreeSpace) { [int64]$wmiInfo.FreeSpace } else { 0 }
      $fs = if ($v.FileSystem) { [string]$v.FileSystem } elseif ($wmiInfo -and $wmiInfo.FileSystem) { [string]$wmiInfo.FileSystem } else { 'Unknown' }
      $label = if ($v.FileSystemLabel) { [string]$v.FileSystemLabel } elseif ($wmiInfo -and $wmiInfo.VolumeName) { [string]$wmiInfo.VolumeName } else { '' }
      $netPath = if ($wmiInfo -and $wmiInfo.ProviderName) { [string]$wmiInfo.ProviderName } else { '' }

      $driveTypeVal = if ($v.DriveType -ne $null) { [int]$v.DriveType } elseif ($wmiInfo -and $wmiInfo.DriveType) { [int]$wmiInfo.DriveType } else { 3 }
      
      $category = 'internal'
      if ($v.DriveType -eq 2 -or ($wmiInfo -and $wmiInfo.DriveType -eq 2) -or ($diskInfo -and $diskInfo.BusType -eq 'USB')) {
        $category = 'removable'
      } elseif ($v.DriveType -eq 4 -or ($wmiInfo -and $wmiInfo.DriveType -eq 5)) {
        $category = 'optical'
      } elseif ($v.DriveType -eq 6 -or ($wmiInfo -and $wmiInfo.DriveType -eq 4) -or $netPath) {
        $category = 'network'
      } elseif ($diskInfo -and $diskInfo.BusType -eq 'File Backed Virtual') {
        $category = 'virtual'
      }

      $health = switch ($v.HealthStatus) {
        0 { 'Healthy' }
        1 { 'Warning' }
        2 { 'Critical' }
        default {
          if ($diskInfo -and $diskInfo.Health) { $diskInfo.Health } else { 'Healthy' }
        }
      }

      if ($letter -or ($v.Path -and $total -gt 104857600)) {
        $mount = if ($letter) { ($letter + ':\\') } else { [string]$v.Path }
        $results += [PSCustomObject]@{
          id = if ($letter) { ('drive-' + $letter) } else { [string]$v.UniqueId }
          driveLetter = if ($letter) { ($letter + ':') } else { $null }
          mountPoint = $mount
          volumeName = $label
          category = $category
          fileSystem = $fs
          totalBytes = $total
          freeBytes = $free
          healthStatus = $health
          busType = if ($diskInfo) { $diskInfo.BusType } else { $null }
          mediaType = if ($diskInfo) { $diskInfo.MediaType } else { $null }
          model = if ($diskInfo) { $diskInfo.Model } else { $null }
          isReadOnly = [bool]($v.OperationalStatus -contains 5 -or $v.FileSystemType -eq 2)
          isBitLockerEncrypted = [bool]($v.BitLockerProtection -eq 1 -or $v.BitLockerProtection -eq 2)
          networkPath = if ($netPath) { $netPath } else { $null }
          diskNumber = if ($partInfo) { $partInfo.DiskNumber } else { $null }
          partitionNumber = if ($partInfo) { $partInfo.PartitionNumber } else { $null }
        }
      }
    }
  }

  if ($results.Count -eq 0 -and $wmiDrives) {
    foreach ($w in $wmiDrives) {
      $letter = [string]$w.DeviceID
      $cleanLetter = $letter.Replace(':', '')
      $cat = switch ($w.DriveType) {
        2 { 'removable' }
        3 { 'internal' }
        4 { 'network' }
        5 { 'optical' }
        default { 'internal' }
      }
      $results += [PSCustomObject]@{
        id = ('drive-' + $cleanLetter)
        driveLetter = $letter
        mountPoint = ($letter + '\\')
        volumeName = [string]$w.VolumeName
        category = $cat
        fileSystem = [string]$w.FileSystem
        totalBytes = [int64]$w.Size
        freeBytes = [int64]$w.FreeSpace
        healthStatus = 'Healthy'
        networkPath = [string]$w.ProviderName
      }
    }
  }

  $results | ConvertTo-Json -Depth 3 -Compress
} catch {
  Get-CimInstance -ClassName Win32_LogicalDisk | ForEach-Object {
    $letter = [string]$_.DeviceID
    $cleanLetter = $letter.Replace(':', '')
    [PSCustomObject]@{
      id = ('drive-' + $cleanLetter)
      driveLetter = $letter
      mountPoint = ($letter + '\\')
      volumeName = $_.VolumeName
      category = switch ($_.DriveType) { 2 {'removable'} 3 {'internal'} 4 {'network'} 5 {'optical'} default {'internal'} }
      fileSystem = $_.FileSystem
      totalBytes = [int64]$_.Size
      freeBytes = [int64]$_.FreeSpace
      healthStatus = 'Healthy'
      networkPath = $_.ProviderName
    }
  } | ConvertTo-Json -Depth 2 -Compress
}
`;

export class WindowsStorageProvider implements IStorageProvider {
  public readonly platformName = "Windows";

  public async getDrives(): Promise<StorageDrive[]> {
    try {
      const rawData = await runPowerShellJson<RawDriveInput | RawDriveInput[]>(
        WINDOWS_STORAGE_SCRIPT,
      );

      const items: RawDriveInput[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];
      const drives: StorageDrive[] = items.map((item) => sanitizeDrive(item));

      // Sort: System drive first, then Alphabetical drive letter, then non-lettered
      return drives.sort((a, b) => {
        if (a.isSystemDrive && !b.isSystemDrive) return -1;
        if (!a.isSystemDrive && b.isSystemDrive) return 1;
        const letterA = a.driveLetter || "ZZ";
        const letterB = b.driveLetter || "ZZ";
        return letterA.localeCompare(letterB);
      });
    } catch (error) {
      console.error("WindowsStorageProvider error:", error);
      return this.getFallbackDrives();
    }
  }

  private async getFallbackDrives(): Promise<StorageDrive[]> {
    try {
      const fallbackScript = `
        Get-CimInstance -ClassName Win32_LogicalDisk | ForEach-Object {
          $letter = [string]$_.DeviceID
          $cleanLetter = $letter.Replace(':', '')
          [PSCustomObject]@{
            id = ('drive-' + $cleanLetter)
            driveLetter = $letter
            mountPoint = ($letter + '\\\\')
            volumeName = $_.VolumeName
            category = switch ($_.DriveType) { 2 {'removable'} 3 {'internal'} 4 {'network'} 5 {'optical'} default {'internal'} }
            fileSystem = $_.FileSystem
            totalBytes = [int64]$_.Size
            freeBytes = [int64]$_.FreeSpace
            healthStatus = 'Healthy'
            networkPath = $_.ProviderName
          }
        } | ConvertTo-Json -Depth 2 -Compress
      `;
      const rawData = await runPowerShellJson<RawDriveInput | RawDriveInput[]>(
        fallbackScript,
      );
      const items: RawDriveInput[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];
      return items.map((item) => sanitizeDrive(item));
    } catch (fallbackError) {
      console.error("Windows fallback drives query failed:", fallbackError);
      return [];
    }
  }

  public async getOverview(): Promise<StorageOverview> {
    const drives = await this.getDrives();
    return this.calculateOverview(drives);
  }

  public async ejectDrive(drive: StorageDrive): Promise<boolean> {
    if (!drive.driveLetter) {
      throw new Error(
        `Cannot safely eject drive without a valid drive letter (Mount: ${drive.mountPoint})`,
      );
    }

    const cleanLetter = drive.driveLetter.substring(0, 1).toUpperCase() + ":";
    const ejectScript = `
      $driveLetter = '${cleanLetter}'
      $shell = New-Object -ComObject Shell.Application
      $drive = $shell.Namespace(17).ParseName($driveLetter)
      if ($drive) {
        $drive.InvokeVerb('Eject')
        'SUCCESS'
      } else {
        throw "Drive $driveLetter not found in Shell namespace"
      }
    `;

    try {
      const result = await runPowerShell(ejectScript);
      return result.includes("SUCCESS");
    } catch (error) {
      throw new Error(
        `Failed to eject drive ${drive.displayName}: ${(error as Error).message}`,
      );
    }
  }

  private calculateOverview(drives: StorageDrive[]): StorageOverview {
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

      if (drive.healthStatus === "Healthy") {
        healthyCount++;
      } else if (drive.healthStatus === "Warning") {
        warningCount++;
      } else if (drive.healthStatus === "Critical") {
        criticalCount++;
      }
    }

    const overallUsagePercent =
      totalBytes > 0
        ? Math.round((totalUsedBytes / totalBytes) * 100 * 10) / 10
        : 0;

    const primaryDrive = drives.find((d) => d.isSystemDrive) || drives[0];

    return {
      totalDrives: drives.length,
      totalBytes,
      totalFreeBytes,
      totalUsedBytes,
      overallUsagePercent,
      healthyCount,
      warningCount,
      criticalCount,
      primaryDrive,
    };
  }
}
