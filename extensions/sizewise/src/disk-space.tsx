import { Color, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { formatBytes } from "./format";
import { mountedVolumes, scanOrShowFailure } from "./sizewise";
import { availableSpaceSummary, usedFraction, Volume } from "./volumes";

/**
 * The startup disk's available space in the menu bar, refreshed every 10 minutes, with a menu of
 * every disk that scans the one you choose in Sizewise.
 */
export default function Command() {
  // Shows the last list at once; Raycast unloads the command once `isLoading` turns false.
  const { data: volumes, isLoading, error } = useCachedPromise(mountedVolumes);
  const startupDisk = volumes?.find((volume) => volume.isStartupDisk) ?? volumes?.[0];

  return (
    <MenuBarExtra
      icon={startupDisk === undefined ? Icon.HardDrive : usageIcon(startupDisk)}
      title={startupDisk?.availableCapacity == null ? undefined : formatBytes(startupDisk.availableCapacity)}
      tooltip={startupDisk === undefined ? "Disk Space" : `${startupDisk.name}: ${availableSpaceSummary(startupDisk)}`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Scan with Sizewise">
        {volumes?.map((volume) => (
          <MenuBarExtra.Item
            key={volume.path}
            icon={usageIcon(volume)}
            title={volume.name}
            subtitle={availableSpaceSummary(volume)}
            onAction={() => scanOrShowFailure(volume.path)}
          />
        ))}
        {error !== undefined && volumes === undefined && <MenuBarExtra.Item title="Couldn't list disks" />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Folder}
          title="Scan Folder…"
          onAction={() => launchCommand({ name: "scan-folder", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function usageIcon(volume: Volume) {
  const fraction = usedFraction(volume);
  return fraction === undefined ? Icon.HardDrive : getProgressIcon(fraction, Color.SecondaryText);
}
