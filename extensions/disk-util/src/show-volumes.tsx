import { Color, environment, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { VolumeItem, VolumeListInfo } from "@components/volume-item";
import { parse } from "plist";

type ListResult = Partial<{ AllDisksAndPartitions: Partial<{ APFSVolumes: VolumeListInfo[] }>[] }>;

export default function ShowVolumes() {
  const { assetsPath } = environment;
  const [deleted, setDeleted] = useState<string[]>([]);
  const { isLoading: permissionsLoading } = useExec("chmod", [
    "+x",
    `${assetsPath}/scripts/delete-volume`,
    `${assetsPath}/scripts/askpass`,
  ]);
  const { isLoading, data } = useExec("/usr/sbin/diskutil", ["list", "-plist"], {
    failureToastOptions: { title: "Failed to list volumes" },
    parseOutput: (args) => {
      try {
        return parse(args.stdout) as ListResult;
      } catch {
        return {} as ListResult;
      }
    },
    execute: !permissionsLoading,
  });

  const volumes = useMemo(() => {
    let res: VolumeListInfo[] = [];
    if (!data || !data.AllDisksAndPartitions) return res;

    data.AllDisksAndPartitions.forEach((disk) => {
      if (!disk.APFSVolumes || disk.APFSVolumes.length === 0) return;
      res = [
        ...res,
        ...disk.APFSVolumes.filter((vol) => vol.MountPoint && vol.VolumeName && vol.VolumeUUID)
          .filter((vol) => !deleted.includes(vol.VolumeUUID!))
          .filter(({ MountPoint: mp = "" }) => mp.startsWith("/Volumes")),
      ];
    });

    return res;
  }, [data, deleted]);

  return (
    <List isLoading={permissionsLoading || isLoading}>
      {volumes.map((volume) => (
        <VolumeItem key={volume.VolumeUUID} {...{ volume, setDeleted, deleted }} />
      ))}
      <List.EmptyView title="No volumes found" icon={{ source: Icon.HardDrive, tintColor: Color.Red }} />
    </List>
  );
}
