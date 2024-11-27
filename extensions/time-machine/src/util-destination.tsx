import { showHUD, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import * as xml2js from "xml2js";

// Type for destination
export type Destination = {
  Name: string; // The volume label as shown in Finder.
  Kind: string; // Whether the destination is locally attached storage or a network device.
  URL?: string; // In the case of a network destination, the URL used for Time Machine configuration.
  MountPoint?: string; // If the volume is currently mounted, the path in the file system at which it was mounted.
  ID: string; // The unique identifier for the destination.
  LastDestination: boolean; // True if disk is used as last backup destination
};

// parse XML string output of `listdestinationinfo -X` into structured object
const parseDestinationXmlString = async (xml: string): Promise<Destination[]> => {
  type ParsedXML = {
    plist: { dict: { key: string; array: { dict: { key: string; string: string[]; integer?: number[] }[] }[] }[] };
  };
  const parser = new xml2js.Parser();
  const result: ParsedXML = await parser.parseStringPromise(xml);
  const destinationsArray = result.plist.dict[0].array[0].dict;

  return destinationsArray.map((destination) => {
    const destination_key = destination.key;
    const destination_dict = destination.string;

    //remove the "LastDestination Item" if it exsits in the "destination_key"
    if (Array.isArray(destination_key)) {
      if (destination.key.indexOf("LastDestination") != -1) {
        destination_key.splice(destination.key.indexOf("LastDestination"), 1);
      }
    }

    const destinationObj: Destination = {
      Name: destination_dict[destination_key.indexOf("Name")],
      Kind: destination_dict[destination_key.indexOf("Kind")],
      URL: destination_key.indexOf("URL") == -1 ? undefined : destination_dict[destination_key.indexOf("URL")],
      MountPoint:
        destination_key.indexOf("MountPoint") == -1
          ? undefined
          : destination_dict[destination_key.indexOf("MountPoint")],
      LastDestination: destination.key.includes("LastDestination") ? true : false,
      ID: destination_dict[destination_key.indexOf("ID")],
    };

    return destinationObj;
  });
};

export function transform_ListbackupTimestamp(timestamp: string): [string, string] {
  // Extract the date part (first 10 characters)
  const datePart: string = timestamp.slice(0, 10); // "2024-06-28"

  // Extract the time part (remaining characters)
  const timePart: string = timestamp.slice(11); // "091007"

  // Format the time part
  const formattedTimePart: string = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`; // "09:10:07"

  // Combine the date and formatted time parts
  return [`${datePart}`, `${formattedTimePart}`];
}

// Get information about destinations currently configured for use with Time Machine.
export function util_listDestinationInfo(): Promise<Destination[]> {
  return new Promise((resolve, reject) => {
    exec("/usr/bin/tmutil destinationinfo -X", (error, stdout) => {
      if (error) {
        reject([]);
      } else {
        parseDestinationXmlString(stdout)
          .then((data) => {
            resolve(data as Destination[]);
          })
          .catch(() => {
            reject([]);
          });
      }
    });
  });
}

// Remove desitination via unmount
export function util_unmount(destination: Destination): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`/usr/sbin/diskutil unmount "${destination.MountPoint}"`, (error, stdout, stderr) => {
      if (error) {
        reject("Failed to unmount" + stderr);
      }
      resolve("Unmounted");
    });
  });
}

// Remove desitination via eject
export function util_eject(destination: Destination): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `/usr/sbin/diskutil eject "$(/usr/sbin/diskutil info "${destination.MountPoint}" | grep "Device Node:" | awk '{print $3}')"`,
      (error, stdout, stderr) => {
        if (error) {
          reject("Failed to eject" + stderr);
        }
        resolve("Ejected");
      },
    );
  });
}

// List backup in the destination
export function util_listbackup(destination: Destination): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec(`/usr/bin/tmutil listbackups -d "${destination.MountPoint}" -t`, (error, stdout, stderr) => {
      if (error) {
        if (error.toString().includes("No backups found for host.")) {
          resolve([]);
        } else {
          reject([]);
          console.error(stderr);
        }
      }
      const backuplist_array = stdout.split("\n") as string[];
      backuplist_array.pop();
      resolve(backuplist_array);
    });
  });
}

// Run backup with certain destination (or no destination, system will pick automatically)
export function util_startbackup(destination?: Destination): Promise<string> {
  let command = "";
  if (destination != undefined) {
    command = `/usr/bin/tmutil startbackup -d '${destination.ID}'`;
  } else {
    command = `/usr/bin/tmutil startbackup --auto`;
  }

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject("");
        console.error(stderr);
      }
      resolve("");
    });
  });
}

// Stop any backup in progress
export function util_stopbackup(): Promise<string> {
  const command = `/usr/bin/tmutil stopbackup`;
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject("");
        console.error(stderr);
      }
      resolve("");
    });
  });
}

// Get timestamp location on the machine
export function util_getTimestampLocation(timestamp: string, desitination: Destination): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `/usr/bin/tmutil listbackups -d '${desitination.MountPoint}' | grep '${timestamp}'`,
      (error, stdout, stderr) => {
        if (error) {
          reject([]);
          console.error(stderr);
        }
        resolve(stdout.split("\n")[0]);
      },
    );
  });
}

// Open timestamp on destination
export function util_openTimestampDestination(timestamp: string, destination: Destination): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `/usr/bin/open $(/usr/bin/tmutil listbackups -d '${destination.MountPoint}' | grep '${timestamp}')`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr.includes("does not exist.")) {
            exec(`/usr/bin/open ${destination.MountPoint}`, (error, stdout, stderr) => {
              if (error) {
                reject([]);
                console.error(stderr);
              }
              resolve("Opened Parent Folder Successfully");
            });
          } else {
            reject([]);
            console.error(stderr);
          }
        }
        resolve("Opened Successfully");
      },
    );
  });
}

// Get Unique size of the timestamp
export function util_getUniquesuzeTimestamp(timestamp: string, destination: Destination): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `/usr/bin/tmutil listbackups -d '${destination.MountPoint}' | grep '${timestamp}';`,
      (error, stdout, stderr) => {
        if (error) {
          reject([]);
          console.error(stderr);
        }
        exec(`/usr/bin/tmutil uniquesize ${stdout}`, (_error_, _stdout_, _stderr_) => {
          if (_error_) {
            reject([]);
            console.error(_stderr_);
          }
          resolve(_stdout_.split(stdout)[0]);
        });
      },
    );
  });
}

// Delete timestamp on destination
export function util_deleteTimestampDestination(timestamp: string, desitination: Destination): Promise<string> {
  return new Promise((resolve) => {
    const cmd_string = `sudo /usr/bin/tmutil delete -d '${desitination.MountPoint}' -t '${timestamp}';`;
    // const cmd_osa_string = `osascript -e 'do shell script "${cmd_string}" with administrator privileges'`;
    Clipboard.copy(cmd_string);
    showHUD("⚠️ Deletion Command Copied ⚠️");
    resolve("");
  });
}

export type BackupContent = {
  folder: string;
  path: string;
  size?: string;
  lastModified_month: string;
  lastModified_day: string;
  lastModified_time: string;
};

// Open to show the content of the backup
export function util_listBackupContent(path: string): Promise<BackupContent[]> {
  return new Promise((resolve, reject) => {
    const cmd_string = `cd "${path}" && /bin/ls -lh | /usr/bin/grep -v "total"`;
    exec(cmd_string, (error, stdout) => {
      if (error) {
        reject([]);
      }
      const rtn_paths: BackupContent[] = [];
      stdout.split("\n").forEach((item) => {
        if (item.length != 0) {
          const item_filtered = item.split(" ").filter((part) => part != "");
          const file_size = item_filtered[4];
          const file_lastModifiedMonth = item_filtered[5];
          const file_lastModifiedDay = item_filtered[6];
          const file_lastModifiedTime = item_filtered[7];
          const file_name = item_filtered.splice(8).join("");
          const file_path = path + "/" + file_name;
          const backupContent: BackupContent = {
            folder: file_name,
            path: file_path,
            size: file_size,
            lastModified_month: file_lastModifiedMonth,
            lastModified_day: file_lastModifiedDay,
            lastModified_time: file_lastModifiedTime,
          };
          rtn_paths.push(backupContent);
        }
      });
      resolve(rtn_paths);
    });
  });
}
