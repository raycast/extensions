import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { exec, spawn } from "child_process";
import DiskSection from "./DiskSection";

export default function ListDisks(): JSX.Element {
  const [disks, setDisks] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    process.env.PATH = `${process.env.PATH}:/usr/sbin:/usr/bin/`;
    process.env.USER = `$USER`;
    fetchDisks("Init");
  }, []);

  /**
   * Initial initialization for all disks
   * Using a stream testwise (did not really work unfortunately)
   */
  async function initialInitDiskSections() {
    showToast({
      style: Toast.Style.Animated,
      title: "Initializing...",
    });

    updateDiskSections("Init");
  }

  // DiskUpdate (Dont show Toast) or Refresh
  async function updateDiskSections(update: string | "DiskUpdate" | "DiskRefresh" | "Init" | "Refresh") {
    // If DiskUpdate, re'initDisks all diskSections without initially fetching them

    const initDisksPromises = disks.map((disk) =>
      disk.initDisks().then(() => {
        setDisks((prevDisks) => [...prevDisks]);
      })
    );
    //Update a second time in case for changes
    await Promise.all(initDisksPromises);

    // Now fetch new disks
    const diskOutput = await execDiskCommand("diskutil list");
    const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
    const sectionStrings = diskOutput.match(sectionRegex) ?? [];
    const newDiskSections: DiskSection[] = sectionStrings.map(DiskSection.createFromString);

    // Check if disks are the same
    // NOTE: This is a simple comparison that checks if the length of disks are the same.
    // You might need to implement a deeper comparison depending on the structure of DiskSection.
    const areDisksTheSame = disks.length === newDiskSections.length;

    if (!areDisksTheSame || update === "Refresh" || update === "DiskRefresh" || update === "Init") {
      if (update !== "DiskRefresh" && update !== "Init") {
        showToast({
          style: Toast.Style.Animated,
          title: "Refreshing...",
        });
      }

      await Promise.all(newDiskSections.map((disk) => disk.initDisks()));
      setDisks(newDiskSections);

      if (update !== "DiskRefresh") {
        showToast({
          style: Toast.Style.Success,
          title: update === "Refresh" ? "Refreshed" : "Initialized",
        });
      }
    }
  }

  /**
   *
   * @param update "DiskUpdate", "Refresh", "Init"
   */
  function fetchDisks(update: string | "Init" | "DiskUpdate" | "DiskUpdate" | "Refresh") {
    try {
      if (update === "Init") {
        initialInitDiskSections();
      } else {
        updateDiskSections(update);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "ERROR: Failed to fetch disks",
      });
    }
  }

  /**
   * Helper
   * @param command
   * @returns
   */
  async function execDiskCommand(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  return (
    <List isShowingDetail={showingDetail}>
      {/* Iterating over each DiskSection object in the disks array */}
      {disks.map((diskSection, index) => {
        return (
          <List.Section key={index} title={diskSection.sectionName}>
            {/* Iterating over each disk in each*/}
            {diskSection.disks.map((disk, diskIndex) => {
              return (
                <List.Item
                  key={diskIndex}
                  title={disk.number + ": " + disk.identifier}
                  subtitle={disk.name + disk.getFormattedSize()}
                  accessories={[{ tag: { value: disk.type } }, disk.getMountStatusAccessory()]}
                  detail={showingDetail ? <List.Item.Detail metadata={disk.getDetails()} /> : null}
                  keywords={[disk.name, disk.mountStatus]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={disk.identifier} />
                      <Action
                        title={"Toggle Detail"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                      {disk.getActions(fetchDisks).map((action, index) => (
                        <Action
                          key={index}
                          title={action.title}
                          icon={action.icon}
                          shortcut={action.shortcut}
                          onAction={() => {
                            action.onAction();
                          }}
                        />
                      ))}
                      <Action
                        title="Refresh List"
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => fetchDisks("Refresh")}
                        icon={Icon.RotateAntiClockwise}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
