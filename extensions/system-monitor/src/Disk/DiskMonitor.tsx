import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { MetadataLabel, MetadataSection } from "../components/MetadataLabel";
import { pendingText, percentTagAccessory, UsageTag } from "../components/CompactMetadata";
import {
  calculateDiskStorage,
  DiskStorageEntry,
  getDiskHealthInfo,
  getRootVolumeDetails,
  shortDiskSize,
} from "../lib/disk-info";
import { formatDiskRate, getDiskThroughput } from "../lib/disk-throughput";

const { displayModeDisk } = getPreferenceValues<ExtensionPreferences>();
const diskPercentMode = displayModeDisk === "free" ? "free" : "usage";

const STATIC_REFRESH_MS = 45_000;
const THROUGHPUT_REFRESH_MS = 12_000;

const VOLUME_ITEM_ID_PREFIX = "disk-";
export const BOOT_VOLUME_ITEM_ID = `${VOLUME_ITEM_ID_PREFIX}boot`;

/**
 * Stable per-volume row id: the boot volume gets a fixed id; every other volume is keyed by its mount
 * point under a separate `volume:` namespace. Mount points are unique even when display names repeat
 * (`/Volumes/Foo` vs `/Volumes/Backup/Foo`), and a drive called "boot" cannot collide with the boot id.
 */
function volumeItemId(disk: DiskStorageEntry): string {
  return disk.isBoot ? BOOT_VOLUME_ITEM_ID : `${VOLUME_ITEM_ID_PREFIX}volume:${disk.mount}`;
}

const volumeActions = <Actions radioButtonNumber={4} />;

/** One `List.Item` per mounted volume; the boot volume's pane also carries the physical-disk depth. */
export default function DiskVolumes({ selectedItemId }: { selectedItemId?: string }) {
  const isAnyVolumeActive = selectedItemId?.startsWith(VOLUME_ITEM_ID_PREFIX) ?? false;
  const isBootActive = selectedItemId === BOOT_VOLUME_ITEM_ID;

  // The rows need only `df`; the slower diskutil/system_profiler reads feed the boot pane alone.
  const {
    data: storage,
    error: storageError,
    revalidate: revalidateStorage,
  } = usePromise(calculateDiskStorage, [], {
    execute: true,
  });

  const {
    data: bootDetails,
    error: bootDetailsError,
    revalidate: revalidateBootDetails,
  } = usePromise(
    async () => {
      const [rootVolume, diskHealth] = await Promise.all([getRootVolumeDetails(), getDiskHealthInfo()]);
      return { rootVolume, diskHealth };
    },
    [],
    { execute: isBootActive },
  );

  useInterval(() => {
    if (isAnyVolumeActive) {
      revalidateStorage();
    }
    if (isBootActive) {
      revalidateBootDetails();
    }
  }, STATIC_REFRESH_MS);

  const { data: throughput, revalidate: revalidateThroughput } = usePromise(
    () => getDiskThroughput({ allowSlowSample: true }),
    [],
    { execute: isBootActive },
  );

  useInterval(() => {
    if (isBootActive) {
      revalidateThroughput();
    }
  }, THROUGHPUT_REFRESH_MS);

  useEffect(() => {
    if (isBootActive) {
      revalidateThroughput();
    }
  }, [isBootActive, revalidateThroughput]);

  if (!storage?.length) {
    // A failed `df` must read as a failure, not as a pane that never finishes loading.
    return (
      <List.Item
        id={BOOT_VOLUME_ITEM_ID}
        title="Disk"
        icon={Icon.HardDrive}
        accessories={[{ text: storageError ? "Unavailable" : pendingText(isAnyVolumeActive) }]}
        detail={
          storageError ? (
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <MetadataLabel title="Status" text="Unavailable" />
                  <MetadataLabel title="Error" text={storageError.message} />
                </List.Item.Detail.Metadata>
              }
            />
          ) : (
            <List.Item.Detail isLoading />
          )
        }
        actions={volumeActions}
      />
    );
  }

  const ioRateText = throughput?.hasSample
    ? `${formatDiskRate(throughput.megabytesPerSecond)} · ${throughput.transfersPerSecond.toFixed(0)} tps · ${throughput.kilobytesPerTransfer.toFixed(1)} KB/t`
    : isBootActive
      ? "Collecting sample…"
      : "—";

  const { rootVolume, diskHealth } = bootDetails ?? {};
  // A failed diskutil/system_profiler read must not leave the physical-disk rows on "Loading…".
  const bootText = (value: string | undefined) => (bootDetailsError ? "Unavailable" : value);

  return (
    <>
      {storage.map((disk) => {
        const total = +disk.totalSize;
        const usedPercent = total > 0 ? Math.round((+disk.usedStorage / total) * 100) : 0;
        const displayedPercent = displayModeDisk === "free" ? 100 - usedPercent : usedPercent;
        const itemId = volumeItemId(disk);

        return (
          <List.Item
            key={itemId}
            id={itemId}
            title={disk.diskName}
            icon={{ source: Icon.HardDrive, tintColor: disk.isExternal ? Color.Blue : Color.SecondaryText }}
            accessories={[percentTagAccessory(displayedPercent, diskPercentMode)]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <UsageTag title="Usage" percent={displayedPercent} displayMode={diskPercentMode} />
                    <MetadataLabel title="Used" text={`${disk.usedStorage} GB`} />
                    <MetadataLabel title="Free" text={`${disk.totalAvailableStorage} GB`} />
                    <MetadataLabel title="Total" text={`${disk.totalSize} GB`} />
                    {disk.isExternal ? <MetadataLabel title="External" text="Yes" /> : null}
                    {disk.isBoot ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <MetadataSection title="Physical Disk" />
                        <MetadataLabel title="SMART Status" text={bootText(diskHealth?.smartStatus)} />
                        <MetadataLabel
                          title="Device · Size"
                          text={bootText(
                            diskHealth && `${diskHealth.deviceName} · ${shortDiskSize(diskHealth.diskSize)}`,
                          )}
                        />
                        <MetadataLabel
                          title="Medium · Protocol"
                          text={bootText(
                            diskHealth && rootVolume && `${diskHealth.mediumType} · ${rootVolume.protocol}`,
                          )}
                        />
                        <MetadataLabel title="File System" text={bootText(rootVolume?.fileSystem)} />
                        <MetadataLabel
                          title="Container"
                          text={bootText(
                            rootVolume &&
                              `${shortDiskSize(rootVolume.containerFreeSpace)} free of ${shortDiskSize(rootVolume.containerTotalSpace)}`,
                          )}
                        />
                        <MetadataLabel
                          title={`I/O (${throughput?.device ?? rootVolume?.physicalStore ?? "disk"})`}
                          text={ioRateText}
                        />
                      </>
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={volumeActions}
          />
        );
      })}
    </>
  );
}
