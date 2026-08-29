import React from "react";
import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { StorageDrive } from "./types/storage";
import { formatBytes, formatPercent } from "./utils/formatters";
import { renderSegmentMeter } from "./utils/meters";
import { getCategoryIcon, getHealthColor, getUsageColor } from "./utils/colors";
import {
  openDriveRoot,
  openInTerminal,
  launchDiskCleanup,
  openStorageSense,
  safelyEjectDrive,
} from "./actions/power-actions";
import { useStorage } from "./hooks/useStorage";

export function getMenuBarTitle(primaryDrive?: StorageDrive): string {
  if (!primaryDrive) return "No Drives";
  const letter = primaryDrive.driveLetter || primaryDrive.displayName;
  const percent = Math.round(primaryDrive.usagePercent);
  if (primaryDrive.usagePercent >= 90) {
    return `⚠️ ${letter} ${percent}%`;
  }
  return `${letter} ${percent}%`;
}

export default function MenuBarStorageCommand(): JSX.Element {
  const { allDrives, overview, isLoading, revalidate } = useStorage();

  const isMac = process.platform === "darwin";
  const exploreTitle = isMac ? "Open in Finder" : "Open in File Explorer";
  const cleanupTitle = isMac
    ? "Open macOS Storage Management"
    : "Launch Windows Disk Cleanup";

  const primaryDrive = overview?.primaryDrive;
  const title = getMenuBarTitle(primaryDrive);
  const tintColor = primaryDrive
    ? getUsageColor(primaryDrive.usagePercent)
    : undefined;

  const handleOpenFullView = async () => {
    try {
      await launchCommand({
        name: "view-storage",
        type: LaunchType.UserInitiated,
      });
    } catch {
      // Fallback
    }
  };

  return (
    <MenuBarExtra
      title={title}
      icon={{
        source: Icon.HardDrive,
        tintColor,
      }}
      isLoading={isLoading}
    >
      {/* 1. Primary Drive Section */}
      {primaryDrive && (
        <MenuBarExtra.Section title="Primary Storage">
          <MenuBarExtra.Item
            title={primaryDrive.displayName}
            subtitle={`${formatBytes(primaryDrive.freeBytes)} free (${formatPercent(primaryDrive.usagePercent)} used)`}
            icon={getCategoryIcon(primaryDrive.category)}
            onAction={() => openDriveRoot(primaryDrive.mountPoint)}
          />
          <MenuBarExtra.Item
            title={`${renderSegmentMeter(primaryDrive.usagePercent, 8)}  ${formatPercent(primaryDrive.usagePercent)} used`}
          />
        </MenuBarExtra.Section>
      )}

      {/* 2. All Drives Submenu Section */}
      {allDrives.length > 0 && (
        <MenuBarExtra.Section title="Connected Drives">
          {allDrives.map((drive) => {
            const meter = renderSegmentMeter(drive.usagePercent, 6);
            const submenuTitle = `${drive.displayName} [${meter} ${formatPercent(drive.usagePercent)}] - ${formatBytes(drive.freeBytes)} free`;

            return (
              <MenuBarExtra.Submenu
                key={drive.id}
                title={submenuTitle}
                icon={{
                  source: getCategoryIcon(drive.category),
                  tintColor: getUsageColor(drive.usagePercent),
                }}
              >
                <MenuBarExtra.Item
                  title={`Capacity: ${formatBytes(drive.usedBytes)} used / ${formatBytes(drive.totalBytes)} total`}
                />
                <MenuBarExtra.Item
                  title={`Free Space: ${formatBytes(drive.freeBytes)} available`}
                />
                <MenuBarExtra.Item
                  title={`Health Status: ${drive.healthStatus} (${drive.fileSystem})`}
                  icon={{
                    source: Icon.Dot,
                    tintColor: getHealthColor(drive.healthStatus),
                  }}
                />

                <MenuBarExtra.Separator />

                <MenuBarExtra.Item
                  title={exploreTitle}
                  icon={Icon.Finder}
                  onAction={() => openDriveRoot(drive.mountPoint)}
                />
                <MenuBarExtra.Item
                  title="Open in Terminal"
                  icon={Icon.Terminal}
                  onAction={() => openInTerminal(drive.mountPoint)}
                />
                <MenuBarExtra.Item
                  title={cleanupTitle}
                  icon={Icon.Trash}
                  onAction={() => launchDiskCleanup(drive.driveLetter)}
                />

                {drive.isRemovable && !drive.isSystemDrive && (
                  <>
                    <MenuBarExtra.Separator />
                    <MenuBarExtra.Item
                      title="Safely Eject Drive"
                      icon={Icon.Eject}
                      onAction={() => safelyEjectDrive(drive, revalidate)}
                    />
                  </>
                )}
              </MenuBarExtra.Submenu>
            );
          })}
        </MenuBarExtra.Section>
      )}

      {/* 3. System Overview */}
      {overview && (
        <MenuBarExtra.Section title="System Overview">
          <MenuBarExtra.Item
            title={`Total Storage: ${formatBytes(overview.totalBytes)}`}
            subtitle={`${overview.totalDrives} ${overview.totalDrives === 1 ? "drive" : "drives"}`}
          />
          <MenuBarExtra.Item
            title={`Total Free: ${formatBytes(overview.totalFreeBytes)}`}
            subtitle={`${formatPercent(100 - overview.overallUsagePercent)} free`}
          />
          <MenuBarExtra.Item
            title={`Health: ${overview.healthyCount} Healthy, ${overview.warningCount} Warning, ${overview.criticalCount} Critical`}
          />
        </MenuBarExtra.Section>
      )}

      {/* 4. Utilities & App Launcher */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Full Storage Space..."
          icon={Icon.Eye}
          onAction={handleOpenFullView}
        />
        <MenuBarExtra.Item
          title="Open Storage Settings"
          icon={Icon.Gear}
          onAction={openStorageSense}
        />
        <MenuBarExtra.Item
          title="Refresh Storage Drives"
          icon={Icon.RotateClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
