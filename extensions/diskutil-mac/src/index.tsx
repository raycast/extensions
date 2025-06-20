import { JSX, useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { exec } from "child_process";
import DiskSection from "./DiskSection";
import { showFailureToast } from "@raycast/utils";

export default function ListDisks(): JSX.Element {
  const [disks, setDisks] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState({ show: false, detail: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    process.env.PATH = `${process.env.PATH}:/usr/sbin:/usr/bin/`;
    process.env.USER = "root";
    fetchDisks("Init");
  }, []);

  // DiskUpdate (Don't show Toast) or Refresh
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

    // Check if disks are the same (simple length comparison)
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
   * Fetch disks with the provided update type.
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
   * Helper to execute a disk command.
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

  // Handler for dropdown filter changes
  function handleFilterChange(newValue: string) {
    setFilter(newValue);
  }

  return (
    <List
      isShowingDetail={showingDetail.show}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Disks" onChange={handleFilterChange} value={filter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Internal" value="internal" />
          <List.Dropdown.Item title="External" value="external" />
        </List.Dropdown>
      }
    >
      {disks.map((diskSection, index) => {
        const filteredDisks = diskSection.disks.filter((disk) => {
          if (filter === "all") return true;
          if (disk.internal === null) return true;
          if (filter === "internal") return disk.internal === true;
          if (filter === "external") return disk.internal === false;
          return true;
        });

        if (filteredDisks.length === 0) {
          return null;
        }
        return (
          <List.Section key={index} title={diskSection.sectionName}>
            {filteredDisks.map((disk, diskIndex) => {
              return (
                <List.Item
                  key={diskIndex}
                  title={disk.number + ": " + disk.identifier}
                  subtitle={disk.name /*+ disk.getFormattedSize()*/}
                  accessories={[{ tag: { value: disk.type } }, disk.getSizeAccessory(), disk.getMountStatusAccessory()]}
                  detail={
                    showingDetail ? (
                      <List.Item.Detail
                        metadata={showingDetail.detail == 1 ? disk.getDetailsPlist() : disk.getDetails()}
                      />
                    ) : null
                  }
                  keywords={[disk.name, disk.mountStatus]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={disk.identifier} />
                      <Action
                        title="Toggle Detail"
                        icon={Icon.Sidebar}
                        onAction={() => setShowingDetail({ show: !showingDetail.show, detail: 0 })}
                      />
                      {/* fetchDisks as the callback function */}
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
                      <Action
                        title="Toggle Detail Alt"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                        icon={Icon.Sidebar}
                        onAction={() => setShowingDetail({ show: !showingDetail.show, detail: 1 })}
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
