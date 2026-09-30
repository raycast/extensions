import {
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  useNavigation,
  showHUD,
  closeMainWindow,
} from "@raycast/api";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  Destination,
  util_listDestinationInfo,
  util_eject,
  util_listbackup,
  transform_ListbackupTimestamp,
  util_openTimestampDestination,
  util_listBackupContent,
  util_getTimestampLocation,
  BackupContent,
  util_startbackup,
} from "./util-destination";
import { Clipboard } from "@raycast/api";
import { open } from "@raycast/api";

// Unmount Action
function MountAction(props: { destination: Destination; set_isLoading: Dispatch<SetStateAction<boolean>> }) {
  if (props.destination.MountPoint != undefined) {
    return (
      <Action
        title="Unmount"
        shortcut={{ key: "x", modifiers: ["ctrl"] }}
        onAction={() => {
          confirmAlert({ icon: Icon.Warning, title: `Confirm unmounting disk: \n ${props.destination.Name}` }).then(
            (confirmed_result) => {
              if (confirmed_result) {
                showToast({ title: "Ejecting...", style: Toast.Style.Animated });
                util_eject(props.destination)
                  .then(() => {
                    props.set_isLoading(true);
                    showToast({ title: "Successfully Ejected", style: Toast.Style.Success });
                  })
                  .catch((err) => showToast({ title: err, style: Toast.Style.Failure }));
              }
            },
          );
        }}
      />
    );
  }
}

// List Backup Action
function ListbackupAction(props: { destination: Destination }) {
  const { push } = useNavigation();
  if (props.destination.MountPoint != undefined) {
    return (
      <Action
        title="List Backup"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
        onAction={() => {
          showToast({ title: "Listing backup ...", style: Toast.Style.Animated }).then((load_toast) => {
            util_listbackup(props.destination)
              .then((listbackup_strings: string[]) => {
                load_toast.hide();
                push(
                  <List>
                    {listbackup_strings.length == 0 ? (
                      <List.EmptyView title="No backup found on this destination." icon={Icon.Info}></List.EmptyView>
                    ) : (
                      listbackup_strings.map((backup_string) => {
                        const [date_str, time_str] = transform_ListbackupTimestamp(backup_string);
                        return (
                          <List.Item
                            icon={Icon.Clock}
                            key={backup_string}
                            title={date_str}
                            subtitle={time_str}
                            actions={
                              <ActionPanel>
                                <ListbackupcontentAction timestamp={backup_string} destination={props.destination} />
                                <Action
                                  title="Reveal in Finder"
                                  shortcut={{ key: "r", modifiers: ["ctrl", "cmd"] }}
                                  onAction={() => {
                                    util_openTimestampDestination(backup_string, props.destination)
                                      .then(() => closeMainWindow({ clearRootSearch: true }))
                                      .catch(() => showHUD(`Failed to open backup: ${backup_string}`));
                                  }}
                                />
                                <Action.CopyToClipboard
                                  title="Copy Timestamp"
                                  content={backup_string}
                                  shortcut={{ key: "c", modifiers: ["cmd"] }}
                                />
                                <Action
                                  title="Copy Timestamp Volume Path"
                                  shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
                                  onAction={() => {
                                    util_getTimestampLocation(backup_string, props.destination).then((data) => {
                                      Clipboard.copy(data.toString());
                                      showHUD("Copied to Clipboard");
                                    });
                                  }}
                                />
                              </ActionPanel>
                            }
                          />
                        );
                      })
                    )}
                  </List>,
                );
              })
              .catch(() => {
                showToast({ title: "Failed to fetch backup list.", style: Toast.Style.Failure });
              });
          });
        }}
      />
    );
  }
}

// List Backup Content action List
function ListbackupcontentAction_List(props: { content_items: BackupContent[] }) {
  return (
    <List>
      {props.content_items.length == 0 ? (
        <List.EmptyView title="The folder is empty" />
      ) : (
        props.content_items.map((item) => {
          return (
            <List.Item
              title={item.folder}
              key={
                item.path +
                item.lastModified_month +
                "-" +
                item.lastModified_day +
                "-" +
                item.lastModified_time +
                "-" +
                Math.random().toString()
              }
              accessories={[
                {
                  tag: { value: item.lastModified_month + "-" + item.lastModified_day + " " + item.lastModified_time },
                },
              ]}
              actions={
                <ActionPanel>
                  <ListbackupcontentAction path={item.path} />
                  <Action.ShowInFinder shortcut={{ key: "r", modifiers: ["cmd", "ctrl"] }} path={item.path} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// List Backup Content action
function ListbackupcontentAction(props: { path?: string; timestamp?: string; destination?: Destination }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Reveal Backup Content"
      onAction={() => {
        if (props.timestamp != undefined && props.destination != undefined) {
          showToast({ title: "Loading Content...", style: Toast.Style.Animated }).then((load_toast) => {
            util_getTimestampLocation(props.timestamp as string, props.destination as Destination)
              .then((timestamp_path) => {
                return util_listBackupContent(timestamp_path.toString());
              })
              .then((path_inner_content: BackupContent[]) => {
                load_toast.hide();
                push(<ListbackupcontentAction_List content_items={path_inner_content} />);
              })
              // .catch(()=>{showToast({title:"Selected Backup Cannot be Opened",style:Toast.Style.Failure})});
              .catch(() => {
                load_toast.hide();
                confirmAlert({
                  icon: Icon.Finder,
                  title: `Backup has not been mounted\nMount by open using Finder ?`,
                  message: `(By manually open folder \n"${props.timestamp}"when finder opens)`,
                }).then((data) => {
                  if (data == true) {
                    if (props.destination != undefined && props.destination.MountPoint != undefined) {
                      open(props.destination?.MountPoint?.toString());
                    } else {
                      showToast({ title: "Selected Item is not Directory", style: Toast.Style.Failure });
                    }
                  }
                });
              });
          });
        } else if (props.path != undefined) {
          showToast({ title: "Loading Content...", style: Toast.Style.Animated }).then((load_toast) => {
            util_listBackupContent(props.path as string)
              .then((path_inner_content: BackupContent[]) => {
                load_toast.hide();
                push(<ListbackupcontentAction_List content_items={path_inner_content} />);
              })
              .catch(() => {
                showToast({ title: "Selected Item is not Directory", style: Toast.Style.Failure });
              });
          });
        } else {
          showToast({ title: "Both PATH and TIMESTAMP are not specified !", style: Toast.Style.Failure });
        }
      }}
    />
  );
}

// Backup to destination action
function StartbackupAction(props: { destination: Destination }) {
  if (props.destination.MountPoint != undefined || props.destination.URL != undefined) {
    return (
      <Action
        title="Start Backup on Destination"
        onAction={() => {
          showToast({ title: "Starting Backup...", style: Toast.Style.Animated }).then((_load_toast_) => {
            console.log(`/usr/bin/tmutil startbackup --destination="${props.destination.ID}"`);
            util_startbackup(props.destination)
              .then(() => {
                setTimeout(() => {
                  _load_toast_.hide();
                  showToast({ title: "Backup Started", style: Toast.Style.Success });
                }, 1000);
              })
              .catch(() => {
                _load_toast_.hide();
                showToast({ title: "Failed to Start Backup", style: Toast.Style.Failure });
              });
          });
        }}
      />
    );
  } else {
    return <></>;
  }
}

// Main export component
export default function Command() {
  const [destinations, set_destinations] = useState<Destination[]>([]);
  const [isLoading, set_isLoading] = useState<boolean>(true);
  useEffect(() => {
    util_listDestinationInfo()
      .then((data) => {
        set_destinations(data);
      })
      .catch(() => {
        set_destinations([]);
      });
    set_isLoading(false);
  }, [isLoading]);

  return (
    <List isLoading={isLoading}>
      {destinations.length === 0 ? (
        <List.EmptyView title="Setup at least one backup destination first." />
      ) : (
        destinations.map((destination: Destination) => {
          const mount_position = destination.Kind == "Local" ? destination.MountPoint : destination.URL;
          return (
            <List.Item
              key={destination.ID}
              icon={Icon.HardDrive}
              title={{ value: destination.Name, tooltip: destination.ID }}
              subtitle={destination.LastDestination ? "← Last Backup Destination" : ""}
              accessories={[
                {
                  tag: {
                    value: mount_position == undefined ? "Unmounted" : "  Mounted  ",
                    color: mount_position == undefined ? Color.Red : Color.Green,
                  },
                },
                {
                  tag: {
                    value: destination.Kind,
                    color: destination.Kind == "Local" ? Color.PrimaryText : Color.PrimaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <StartbackupAction destination={destination} />
                  <ListbackupAction destination={destination} />
                  <MountAction destination={destination} set_isLoading={set_isLoading} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
