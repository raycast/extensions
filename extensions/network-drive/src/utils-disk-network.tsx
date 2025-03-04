import { exec } from "child_process";
import { get_pref_smb_ip, get_pref_smb_pwd, get_pref_smb_usr } from "./utils-preference";
import { confirmAlert, Icon } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";

export async function getNetworkDrives(set_data: Dispatch<SetStateAction<string[]>>) {
  const ip: string = get_pref_smb_ip();
  const usr: string = get_pref_smb_usr();
  const pwd: string = get_pref_smb_pwd();
  exec(
    `/usr/bin/smbutil -v view -f //${usr}:${pwd}@${ip} | awk '/Disk/ {print $1}' FS="  "`,
    async (err, stdout, stderr) => {
      if (err) {
        // Prompt user to install "samba" if "smbclient" command is not found
        const emptyArray: string[] = [];
        set_data(emptyArray);
        if (stderr.includes(`/opt/homebrew/bin/smbclient: No such file or directory`)) {
          await confirmAlert({
            title: "You have not installed samba",
            icon: Icon.Warning,
            message: "Please install it via `brew install samba`.",
          });
        }
      } else {
        try {
          // Process stdout to array of network drive
          const stdout_drive: string[] = [];
          const stdout_strlines = stdout.split("\n");
          stdout_strlines.forEach((line) => {
            if (line.length != 0) {
              stdout_drive.push(line);
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
