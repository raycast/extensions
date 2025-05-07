import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { exec } from "child_process";
import DiskSection from "./DiskSection";
import { showFailureToast } from "@raycast/utils";

export default function ListDisks(): JSX.Element {
  const [disks, setDisks] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    process.env.PATH = `${process.env.PATH}:/usr/sbin:/usr/bin/`;
    process.env.USER = process.env.USER || "";
    fetchDisks("Init");
  }, []);

  // DiskUpdate (Dont show Toast) or Refresh
  /**
   * Update the DiskSections. Only do a quick refresh on DiskUpdate
   * @param One of the annotated types to choose the style of update
   */
  async function updateDiskSections(update: "DiskUpdate" | "DiskRefresh" | "Init" | "Refresh") {
    setIsLoading(true);

    if (update === "Init") {
      showToast({
        style: Toast.Style.Animated,
        title: "Initializing...",
      });
    }
    // First do a quick update on existing disks
    const initDisksPromises = disks.map((disk) =>
      disk.initDisks().then(() => {
        setDisks((prevDisks) => [...prevDisks]);
      })
    );
    await Promise.all(initDisksPromises);

    // Then fetch all new disks
    const diskOutput = await execDiskCommand("diskutil list");
    const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
    const sectionStrings = diskOutput.match(sectionRegex) ?? [];
    const newDiskSections: DiskSection[] = sectionStrings.map(DiskSection.createFromString);

    // Check if disks are the same
    // NOTE: This is a simple comparison that checks if the length of disks are the same.
    // You might need to implement a deeper comparison depending on the structure of DiskSection.
    const areDisksTheSame = disks.length === newDiskSections.length;

    if (!areDisksTheSame || update === "Refresh" || update === "DiskRefresh") {
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
    setIsLoading(false);
  }

  /**
   *
   * @param update "DiskUpdate", "DiskRefresh", "Refresh", "Init"
   */
  function fetchDisks(update: "Init" | "DiskUpdate" | "DiskRefresh" | "Refresh") {
    try {
      updateDiskSections(update);
    } catch (error) {
      showFailureToast(error, { title: "ERROR: Failed to fetch disks" });
      setIsLoading(false);
    }
  }

  /**
   * Helper
   * @param command
   * @returns
   */
  async function execDiskCommand(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  return (
    <List isShowingDetail={showingDetail} isLoading={isLoading}>
      {/* Iterating over each DiskSection object in the disks array */}
      {disks.map((diskSection, index) => {
        return (
          <List.Section key={index} title={diskSection.sectionName}>
            {/* Iterating over each disk in each section*/}
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
