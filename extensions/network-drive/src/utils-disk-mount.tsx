import { Dispatch, SetStateAction } from "react";
import { get_pref_smb_ip } from "./utils-preference";
import { exec } from "child_process";

export function checkMountedState(_vol_: string, mounted_vols: string[]): boolean {
  let rtn_match = false;
  mounted_vols.forEach((mounted_vol) => {
    if (mounted_vol.split("-")[0] == _vol_) {
      rtn_match = true;
    }
  });
  return rtn_match;
}

export function findMountedName(_vol_: string, mounted_vols: string[]): string {
  let rtn_match = "";
  mounted_vols.forEach((mounted_vol) => {
    if (mounted_vol.split("-")[0] == _vol_) {
      rtn_match = "/Volumes/" + mounted_vol;
    }
  });
  return rtn_match;
}

export async function getNetworkDrivesMounted_(set_data: Dispatch<SetStateAction<string[]>>) {
  const _filesystem_ = "@" + get_pref_smb_ip();
  exec(`/sbin/mount | /usr/bin/grep --context=0 ${_filesystem_}`, (_err, stdout: string) => {
    const mounted_networkDrives_strline = stdout.split("\n").filter((line: string) => {
      return line.includes(get_pref_smb_ip());
    });
    const mounted_networkDrives = mounted_networkDrives_strline.map((item: string) => {
      return item.split("on /Volumes/")[1].split(" (")[0];
    });
    set_data(mounted_networkDrives);
  });
}
