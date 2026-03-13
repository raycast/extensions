import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { VolumeItem } from "@components/volume-item";
import { useScriptsAccessible } from "@hooks/use-scripts-accessible";
import { useVolumes } from "@hooks/use-volumes";

export type VolumeInfo = Partial<{
  VolumeUUID: string;
  VolumeName: string;
  FilesystemName: string;
  MountPoint: string;
  DeviceIdentifier: string;
  DeviceNode: string;
  CapacityInUse: number;
  TotalSize: number;
  FileVault: boolean;
}>;

export type VolumeListInfo = Pick<VolumeInfo, "MountPoint" | "VolumeUUID" | "VolumeName">;

export type ListResult = Partial<{ AllDisksAndPartitions: Partial<{ APFSVolumes: VolumeListInfo[] }>[] }>;

export const Volumes = () => {
  const [deleted, setDeleted] = useState<string[]>([]);
  const { isScriptsLoading } = useScriptsAccessible();
  const { volumes, isLoadingVolumes } = useVolumes(isScriptsLoading);

  const filteredVolumes = useMemo(() => {
    let res: VolumeListInfo[] = [];
    if (!volumes || !volumes.AllDisksAndPartitions) return res;

    volumes.AllDisksAndPartitions.forEach((disk) => {
      if (!disk.APFSVolumes || disk.APFSVolumes.length === 0) return;
      res = [
        ...res,
        ...disk.APFSVolumes.filter((vol) => vol.MountPoint && vol.VolumeName && vol.VolumeUUID)
          .filter((vol) => !deleted.includes(vol.VolumeUUID!))
          .filter(({ MountPoint: mp = "" }) => mp.startsWith("/Volumes")),
      ];
    });

    return res;
  }, [volumes, deleted]);

  return (
    <List isLoading={isScriptsLoading || isLoadingVolumes}>
      {filteredVolumes.map((volume) => (
        <VolumeItem key={volume.VolumeUUID} {...{ volume, setDeleted, deleted }} />
      ))}
      <List.EmptyView title="No volumes found" icon={{ source: Icon.HardDrive, tintColor: Color.Red }} />
    </List>
  );
};
