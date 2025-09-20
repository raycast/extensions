import {
  ActionPanel,
  Action,
  List,
  showToast,
  showHUD,
  Toast,
  Icon,
  Color,
  confirmAlert,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { exec } from "child_process";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { get_pref_smb_ip } from "./utils-preference";
import { delayOperation } from "./utils-other";
import { checkMountedState, findMountedName, getNetworkDrivesMounted_ } from "./utils-disk-mount";
import { getNetworkDrives } from "./utils-disk-network";
import { DiskInfo, getNetworkDrivesInfo, get_infoOfNetworkDrive } from "./utils-disk-info";

export default function Command() {
  // React init hooks and variables (fetch required data)
  const [network_drivess, set_networkDrives] = useState<string[]>([]);
  const [network_volumes_mounted, set_networkDrivesMounted] = useState<string[]>([]);
  const [network_drive_info, set_networkDriveInfo] = useState<DiskInfo[]>([]);
  const [need_update, set_update] = useState<boolean>(false);
  const [isLoading, set_isLoading] = useState<boolean>(true);
  const [error, set_error] = useState<boolean>(false);
  const drivesRef = useRef(network_drivess);
  drivesRef.current = network_drivess;

  // Fetch disk data from via the async helper functions
  useEffect(() => {
    set_isLoading(true);
    getNetworkDrives(set_networkDrives);
    getNetworkDrivesMounted_(set_networkDrivesMounted);
    getNetworkDrivesInfo(set_networkDriveInfo);
    set_update(false);
  }, [need_update]);

  // TimeOut to handle case where fetching fails
  setTimeout(() => {
    if (drivesRef.current.length == 0) {
      set_isLoading(false);
      set_error(true);
    } else {
      set_isLoading(false);
    }
  }, 5000);

  // Render the list based on the data retrived
  return (
    <List isLoading={isLoading && network_drivess.length == 0}>
      {error && (
        <List.EmptyView
          title="Failed to Fetch Disk Information"
          description="Check settings in preferences"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={() => {
                  openExtensionPreferences();
                  popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {network_drivess?.map((drive) => (
        <DriveItem
          key={drive}
          vol={drive}
          info={network_drive_info}
          mounted_vols={network_volumes_mounted}
          set_update={set_update}
        />
      ))}
    </List>
  );
}

// ██████████████████████████████████████████████████████████████████████████████

function DriveItem(props: {
  vol: string;
  mounted_vols: string[];
  info: DiskInfo[];
  set_update: Dispatch<SetStateAction<boolean>>;
}) {
  const mnt = checkMountedState(props.vol, props.mounted_vols);
  const inf = get_infoOfNetworkDrive(props.vol, props.info) as DiskInfo;
  let iused = "XX";
  let ifree = "XX";
  let capacity = "XX%";
  //   let capabityInt = 0;
  if (inf != undefined) {
    iused = (inf.iused / 1024 ** 3).toFixed(2);
    ifree = (inf.ifree / 1024 ** 3).toFixed(2);
    capacity = inf.capacity;
    // capabityInt = parseInt(capacity.split("%")[0]);
  }

  return (
    <List.Item
      title={props.vol}
      actions={<DriveActions vol={props.vol} mounted_vols={props.mounted_vols} set_update={props.set_update} />}
      icon={mnt ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
      accessories={
        !mnt
          ? []
          : [
              { tag: { value: `${iused} TB`, color: Color.Red }, tooltip: "iUsed" },
              { tag: { value: `${ifree} TB`, color: Color.Green }, tooltip: "iFree" },
              { tag: { value: `${capacity}`, color: Color.PrimaryText }, tooltip: "Capacity" },
            ]
      }
    />
  );
}

function DriveActions(props: { vol: string; mounted_vols: string[]; set_update: Dispatch<SetStateAction<boolean>> }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Quick Option">
        <Action
          title="Mount/Unmount"
          onAction={async () => {
            const mouned = checkMountedState(props.vol, props.mounted_vols);
            if (!mouned) {
              showToast({ title: "Mounting...", style: Toast.Style.Animated });
              exec(`osascript -e 'mount volume "smb://${get_pref_smb_ip()}/${props.vol}"'`, async (err) => {
                if (err) {
                  showToast({ title: "Action Failed" });
                }
                await delayOperation(1000);
                showToast({ title: `${props.vol}  Mounted` });
                props.set_update(true);
              });
            } else {
              showToast({ title: "Unmounting...", style: Toast.Style.Animated });
              if (!checkMountedState(props.vol, props.mounted_vols)) {
                showToast({ title: `${props.vol} is Already Unmounted`, style: Toast.Style.Failure });
              } else {
                exec(
                  `/usr/sbin/diskutil unmount "${findMountedName(props.vol, props.mounted_vols)}"`,
                  async (_err, stdout) => {
                    await delayOperation(1000);
                    if (!stdout.includes("Unmount successful")) {
                      showToast({ title: "Action Failed", style: Toast.Style.Failure });
                    } else {
                      showToast({ title: `${props.vol} Unmounted`, style: Toast.Style.Success });
                    }
                    props.set_update(true);
                  },
                );
              }
            }
          }}
        ></Action>
        <Action
          title="Mount and Open"
          onAction={async () => {
            showToast({ title: "Mounting...", style: Toast.Style.Animated });
            exec(`osascript -e 'mount volume "smb://${get_pref_smb_ip()}/${props.vol}"'`, async (err) => {
              await delayOperation(1000);
              if (err) {
                showHUD("Action Failed ⚠️");
              }
              exec(`open "${findMountedName(props.vol, props.mounted_vols)}"`);
              showHUD(`Mounted  [${props.vol}]  🚀🌖`);
            });
          }}
        ></Action>
        <Action
          title="Unmount All"
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            if (
              await confirmAlert({
                icon: Icon.AlarmRinging,
                title: `Are you sure you want to \n "Unmount All Drives" ?`,
              })
            ) {
              showToast({ title: "Unmounting All...", style: Toast.Style.Animated });
              if (!(props.mounted_vols == undefined || props.mounted_vols.length == 0)) {
                await delayOperation(1000);
                props.mounted_vols.forEach((_vol_) => {
                  exec(`/usr/sbin/diskutil unmount "${findMountedName(_vol_, props.mounted_vols)}"`, async (err) => {
                    if (err) {
                      showToast({ title: "Action Failed", style: Toast.Style.Failure });
                    }
                    showHUD("Unmounted All  🪂🌍");
                    props.set_update(true);
                  });
                });
              } else {
                await delayOperation(1000);
                showHUD("Unmounted All  🪂🌍");
              }
            }
          }}
        ></Action>
      </ActionPanel.Section>
      <ActionPanel.Section title="Specific Option">
        <Action
          title="Mount"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => {
            showToast({ title: "Mounting...", style: Toast.Style.Animated });
            await delayOperation(1000);
            exec(`osascript -e 'mount volume "smb://${get_pref_smb_ip()}/${props.vol}"'`, async (err) => {
              if (err) {
                showToast({ title: "Action Failed" });
              }
              showToast({ title: `${props.vol} Mounted` });
              props.set_update(true);
            });
          }}
        ></Action>
        <Action
          title="Unmount"
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            showToast({ title: "Unmounting...", style: Toast.Style.Animated });
            await delayOperation(1000);
            if (!props.mounted_vols.includes(props.vol)) {
              showToast({ title: `${props.vol} is Already Unmounted`, style: Toast.Style.Failure });
            } else {
              exec(
                `/usr/sbin/diskutil unmount "${findMountedName(props.vol, props.mounted_vols)}"`,
                async (_err, stdout) => {
                  if (!stdout.includes("Unmount successful")) {
                    showToast({ title: "Action Failed", style: Toast.Style.Failure });
                  } else {
                    showToast({ title: `${props.vol} Unmounted`, style: Toast.Style.Success });
                  }
                  props.set_update(true);
                },
              );
            }
          }}
        ></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}
