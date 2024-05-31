import { exec } from "child_process";
import { get_pref_smb_ip, get_pref_smb_pwd, get_pref_smb_usr } from "./utils-preference";
import { confirmAlert } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";

// * e.g.
// * exec(`/opt/homebrew/bin/smbclient -L //XXXX.XX.XX.XXX --grepable --user=suowei.h --password=XXXXX --workgroup=WORKGROUP`, (err, stdout, stderr) => {
// *     let disks = smbclient_output_format(stdout);
// *     disks.forEach((disk) => { console.log(disk); })
// * });
function smbclient_output_format(stdout: string): string[] {
  try {
    const str_array: string[] = [];
    const lines = stdout.split("\n");
    lines.forEach((line) => {
      if (line.startsWith("Disk")) {
        const parts = line.split("|");
        if (parts.length > 1) {
          str_array.push(parts[1]);
        }
      }
    });
    return str_array;
  } catch (err) {
    return [];
  }
}

// * e.g.
// * let [volumes, set_volumes] = useState<string[]>([])
// * useEffect(() => {smbclient_getVolumes(set_volumes)}, []);
export async function smbclient_getVolumes(setter: Dispatch<SetStateAction<string[]>>) {
  const ip: string = get_pref_smb_ip();
  const usr: string = get_pref_smb_usr();
  const pwd: string = get_pref_smb_pwd();
  exec(
    `/opt/homebrew/bin/smbclient -L //${ip} --grepable --user=${usr} --password=${pwd} --workgroup=WORKGROUP`,
    async (err, stdout, stderr) => {
      if (err) {
        console.log("Failure fetching db" + stderr);
        if (stderr.includes(`/opt/homebrew/bin/smbclient: No such file or directory`)) {
          await confirmAlert({
            title: "You have not installed samba",
            message: "Please installed it via `brew install samba`.",
          });
        }
      } else {
        setter(smbclient_output_format(stdout));
      }
    },
  );
}
