import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { MetadataLabel, MetadataSection, coloredAccessoryText } from "../components/MetadataLabel";
import { calculateDiskStorage, getDiskHealthInfo, getRootVolumeDetails } from "../lib/disk-info";
import { formatDiskRate, getDiskThroughput } from "../lib/disk-throughput";

const { displayModeDisk } = getPreferenceValues<ExtensionPreferences>();
const diskPercentMode = displayModeDisk === "free" ? "free" : "usage";

const STATIC_REFRESH_MS = 45_000;
const THROUGHPUT_REFRESH_MS = 12_000;

export default function DiskMonitor({ isActive = false }: { isActive?: boolean }) {
  const { data: staticData, revalidate: revalidateStatic } = usePromise(
    async () => {
      const [storage, rootVolume, diskHealth] = await Promise.all([
        calculateDiskStorage(),
        getRootVolumeDetails(),
        getDiskHealthInfo(),
      ]);

      const primaryDisk = storage[0];
      const primaryTotal = primaryDisk ? +primaryDisk.totalSize : 0;
      const usedPercentage = primaryTotal > 0 ? Math.round((+primaryDisk.usedStorage / primaryTotal) * 100) : 0;
      const freePercentage = primaryTotal > 0 ? 100 - usedPercentage : 0;

      return {
        storage,
        rootVolume,
        diskHealth,
        usedPercentage,
        freePercentage,
      };
    },
    [],
    { execute: true },
  );

  useInterval(() => {
    if (isActive) {
      revalidateStatic();
    }
  }, STATIC_REFRESH_MS);

  const { data: throughput, revalidate: revalidateThroughput } = usePromise(
    () => getDiskThroughput({ allowSlowSample: true }),
    [],
    { execute: isActive },
  );

  useInterval(() => {
    if (isActive) {
      revalidateThroughput();
    }
  }, THROUGHPUT_REFRESH_MS);

  useEffect(() => {
    if (isActive) {
      revalidateThroughput();
    }
  }, [isActive, revalidateThroughput]);

  const storageAccessory =
    staticData?.storage[0] &&
    (displayModeDisk === "free" ? `${staticData.freePercentage} % free` : `${staticData.usedPercentage} % used`);

  const throughputAccessory =
    isActive && throughput?.hasSample ? formatDiskRate(throughput.megabytesPerSecond) : undefined;

  const accessoryText = throughputAccessory ?? storageAccessory ?? (isActive ? "Loading…" : "—");
  const coloredAccessory =
    throughputAccessory || accessoryText === "Loading…" || accessoryText === "—"
      ? accessoryText
      : coloredAccessoryText(accessoryText, diskPercentMode);

  return (
    <List.Item
      id="disk"
      title="Disk"
      icon={Icon.HardDrive}
      accessories={[{ text: coloredAccessory }]}
      detail={
        <DiskMonitorDetail
          storage={staticData?.storage ?? []}
          rootVolume={staticData?.rootVolume}
          diskHealth={staticData?.diskHealth}
          throughput={throughput}
          isCollectingThroughput={isActive && !throughput?.hasSample}
        />
      }
      actions={<Actions radioButtonNumber={4} />}
    />
  );
}

function DiskMonitorDetail({
  storage,
  rootVolume,
  diskHealth,
  throughput,
  isCollectingThroughput,
}: {
  storage: Awaited<ReturnType<typeof calculateDiskStorage>>;
  rootVolume?: Awaited<ReturnType<typeof getRootVolumeDetails>>;
  diskHealth?: Awaited<ReturnType<typeof getDiskHealthInfo>>;
  throughput?: Awaited<ReturnType<typeof getDiskThroughput>>;
  isCollectingThroughput: boolean;
}) {
  const ioRateText = isCollectingThroughput
    ? "Collecting sample…"
    : throughput?.hasSample
      ? formatDiskRate(throughput.megabytesPerSecond)
      : "—";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataSection title="Physical Disk" />
          <MetadataLabel title="Device" text={diskHealth?.deviceName ?? "Unknown"} />
          <MetadataLabel title="Medium Type" text={diskHealth?.mediumType ?? "Unknown"} />
          <MetadataLabel title="SMART Status" text={diskHealth?.smartStatus ?? "Unknown"} />
          <MetadataLabel title="Disk Size" text={diskHealth?.diskSize ?? "Unknown"} />
          <MetadataLabel title="Volume" text={rootVolume?.volumeName ?? "Unknown"} />
          <MetadataLabel title="File System" text={rootVolume?.fileSystem ?? "Unknown"} />
          <MetadataLabel title="Media Type" text={rootVolume?.mediaType ?? "Unknown"} />
          <MetadataLabel title="Protocol" text={rootVolume?.protocol ?? "Unknown"} />
          <MetadataLabel title="Physical Store" text={rootVolume?.physicalStore ?? "Unknown"} />
          <MetadataLabel title="Container Total" text={rootVolume?.containerTotalSpace ?? "Unknown"} />
          <MetadataLabel title="Container Free" text={rootVolume?.containerFreeSpace ?? "Unknown"} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Disk I/O" />
          <MetadataLabel title="Device" text={throughput?.device ?? rootVolume?.physicalStore ?? "Unknown"} />
          <MetadataLabel title="I/O Rate" text={ioRateText} />
          {throughput?.hasSample ? (
            <>
              <MetadataLabel
                title="Transfers"
                text={`${throughput.transfersPerSecond.toFixed(0)} tps · ${throughput.kilobytesPerTransfer.toFixed(1)} KB/t`}
              />
              <MetadataLabel title="Note" text="macOS reports combined read/write throughput" />
            </>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Volumes" />
          {storage.map((disk, index) => (
            <MetadataLabel
              key={index}
              title={disk.diskName}
              icon={
                disk.isExternal
                  ? { source: Icon.HardDrive, tintColor: Color.Blue }
                  : { source: Icon.HardDrive, tintColor: Color.SecondaryText }
              }
              text={
                displayModeDisk === "free"
                  ? `${disk.totalAvailableStorage} GB available of ${disk.totalSize} GB`
                  : `${disk.usedStorage} GB used of ${disk.totalSize} GB`
              }
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
