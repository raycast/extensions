import { getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import os from "node:os";

import { Actions } from "../components/Actions";
import { MetadataLabel, MetadataSection } from "../components/MetadataLabel";
import { calculateDiskStorage, getHardwareInfo, getOSInfo, getRootVolumeDetails } from "./SystemUtils";

const { displayModeDisk } = getPreferenceValues<ExtensionPreferences>();

export default function SystemInfo() {
  return (
    <List.Item
      id="system-info"
      title="System Info"
      icon={Icon.Finder}
      detail={<SystemInfoDetail />}
      actions={<Actions />}
    />
  );
}

function SystemInfoDetail() {
  const { data, isLoading } = usePromise(async () => {
    const [hardware, storage, osInfo, rootVolume] = await Promise.all([
      getHardwareInfo(),
      calculateDiskStorage(),
      getOSInfo(),
      getRootVolumeDetails(),
    ]);

    return {
      hardware,
      osInfo,
      storage,
      rootVolume,
    };
  });

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataSection title="Software" />
          <MetadataLabel title="macOS" text={data?.osInfo.display ?? "-"} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Hardware Specifications" />
          <MetadataLabel title="Hostname" text={os.hostname().replace(/\.(local|lan)$/, "")} />
          <MetadataLabel title="Model" text={data?.hardware.modelName ?? "-"} />
          <MetadataLabel title="Model Year" text={data?.hardware.modelYear ?? "-"} />
          <MetadataLabel title="Model Identifier" text={data?.hardware.modelIdentifier ?? "-"} />
          <MetadataLabel title="Model Number" text={data?.hardware.modelNumber ?? "-"} />
          <MetadataLabel title="Chip" text={data?.hardware.chip ?? "-"} />
          <MetadataLabel title="CPU Cores" text={data?.hardware.totalCores ?? "-"} />
          <MetadataLabel title="GPU" text={data?.hardware.gpuChipset ?? "-"} />
          <MetadataLabel title="GPU Cores" text={data?.hardware.gpuCores ?? "-"} />
          <MetadataLabel title="GPU Memory" text={data?.hardware.gpuMemory ?? "-"} />
          <MetadataLabel title="Memory" text={data?.hardware.memory ?? "-"} />
          <MetadataLabel title="Serial Number" text={data?.hardware.serialNumber ?? "-"} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataSection title="Storage" />
          <MetadataLabel title="Volume" text={data?.rootVolume.volumeName ?? "-"} />
          <MetadataLabel title="File System" text={data?.rootVolume.fileSystem ?? "-"} />
          <MetadataLabel title="Media Type" text={data?.rootVolume.mediaType ?? "-"} />
          <MetadataLabel title="Protocol" text={data?.rootVolume.protocol ?? "-"} />
          <MetadataLabel title="Physical Store" text={data?.rootVolume.physicalStore ?? "-"} />
          {data?.storage.map((disk, index) => {
            return (
              <MetadataLabel
                key={index}
                title={disk.diskName}
                text={
                  displayModeDisk === "free"
                    ? `${disk.totalAvailableStorage} GB available of ${disk.totalSize} GB`
                    : `${disk.usedStorage} GB used of ${disk.totalSize} GB`
                }
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
