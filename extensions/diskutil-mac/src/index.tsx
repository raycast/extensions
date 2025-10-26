import { JSX, useEffect, useState } from "react";
import { Icon, List, Toast, showToast } from "@raycast/api";
import DiskSection, { parseDiskSections } from "./DiskSection";
import { SizesView, cycleSizesView, loadSizesView, saveSizesView } from "./sizesViewUtils";
import { execDiskCommand } from "./diskUtils";
import DiskListItem from "./DiskListItem";

export default function ListDisks(): JSX.Element {
  const [diskSections, setDisksSections] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState({ show: false, detail: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sizesView, setSizesView] = useState<SizesView>(SizesView.Full);

  useEffect(() => {
    loadSizesView().then(setSizesView);
    fetchDisks("Init");
  }, []);

  async function updateDiskSections(update: "DiskUpdate" | "DiskRefresh" | "Init" | "Refresh") {
    setIsLoading(true);

    if (update === "Init") {
      showToast({ style: Toast.Style.Animated, title: "Initializing..." });
    }

    const diskOutput = await execDiskCommand("diskutil list");
    const newDiskSections = parseDiskSections(diskOutput);

    await Promise.all(newDiskSections.map((diskSection) => diskSection.initDisks()));
    setDisksSections(newDiskSections);

    if (update !== "DiskRefresh") {
      showToast({ style: Toast.Style.Success, title: update === "Refresh" ? "Refreshed" : "Initialized" });
    }

    setIsLoading(false);
  }

  function fetchDisks(update: "Init" | "DiskUpdate" | "DiskRefresh" | "Refresh") {
    updateDiskSections(update).catch((error) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to fetch disks", message: String(error) });
      setIsLoading(false);
    });
  }

  function handleFilterChange(value: string) {
    setFilter(value);
  }

  async function toggleSizesView() {
    const nextView = cycleSizesView(sizesView);
    setSizesView(nextView);
    await saveSizesView(nextView);
  }

  const hasDisks = diskSections.length > 0;
  const hasFilteredDisks = diskSections.some((section) =>
    section.disks.some((disk) => filter === "all" || disk.internal === (filter === "internal"))
  );

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
      {isLoading && !hasDisks ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Looking for Disks..."
          description="Running diskutil list to view available disks on your system."
        />
      ) : !isLoading && !hasDisks ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No Disks Found"
          description="Unable to detect any disks on your system. Try refreshing."
        />
      ) : !isLoading && !hasFilteredDisks ? (
        <List.EmptyView
          icon={Icon.Filter}
          title={`No ${filter === "internal" ? "Internal" : "External"} Disks Found`}
          description={`Try changing the filter to see ${filter === "internal" ? "external" : "internal"} disks.`}
        />
      ) : isLoading && !hasFilteredDisks ? (
        <List.EmptyView
          icon={Icon.Filter}
          title={`No ${filter === "internal" ? "Internal" : "External"} Disks Found`}
          description={`Try changing the filter to see ${filter === "internal" ? "external" : "internal"} disks.`}
        />
      ) : (
        diskSections.map((section, index) => (
          <List.Section key={index} title={section.sectionName}>
            {section.disks
              .filter((disk) => filter === "all" || disk.internal === (filter === "internal"))
              .map((disk, diskIndex) => (
                <DiskListItem
                  key={diskIndex}
                  disk={disk}
                  showingDetail={showingDetail}
                  sizesView={sizesView}
                  onToggleDetail={(detailType) => setShowingDetail({ show: !showingDetail.show, detail: detailType })}
                  onRefresh={() => fetchDisks("Refresh")}
                  onToggleSizesView={toggleSizesView}
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
