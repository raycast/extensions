import { exec } from "child_process";
import { get_pref_smb_ip, get_pref_smb_pwd, get_pref_smb_usr } from "./utils-preference";
import { confirmAlert } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";

export function delayOperation(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function getNetworkDrivesMounted(set_data: Dispatch<SetStateAction<string[]>>) {
  exec("/sbin/mount", (_err, stdout: string) => {
    const mounted_networkDrives_strline = stdout.split("\n").filter((line: string) => {
      return line.includes(get_pref_smb_ip()) && line.includes(get_pref_smb_usr());
    });
    const mounted_networkDrives = mounted_networkDrives_strline.map((item: string) => {
      return item.split("on /Volumes/")[1].split(" (")[0];
    });
    set_data(mounted_networkDrives);
  });
}

export async function getNetworkDrives(set_data: Dispatch<SetStateAction<string[]>>) {
  const ip: string = get_pref_smb_ip();
  const usr: string = get_pref_smb_usr();
  const pwd: string = get_pref_smb_pwd();
  exec(
    `/opt/homebrew/bin/smbclient -L //${ip} --grepable --user=${usr} --password=${pwd} --workgroup=WORKGROUP`,
    async (err, stdout, stderr) => {
      if (err) {
        // Prompt user to install "samba" if "smbclient" command is not found
        const emptyArray: string[] = [];
        set_data(emptyArray);
        if (stderr.includes(`/opt/homebrew/bin/smbclient: No such file or directory`)) {
          await confirmAlert({
            title: "You have not installed samba",
            message: "Please installed it via `brew install samba`.",
          });
        }
      } else {
        try {
          // Process stdout to array of network drive
          const stdout_drive: string[] = [];
          const stdout_strlines = stdout.split("\n");
          stdout_strlines.forEach((line) => {
            if (line.startsWith("Disk")) {
              const stdout_strlines_part = line.split("|");
              if (stdout_strlines_part.length > 1) {
                stdout_drive.push(stdout_strlines_part[1]);
              }
            }
          });
          set_data(stdout_drive);
        } catch (err) {
          set_data([]);
        }
      }
    },
  );
}
