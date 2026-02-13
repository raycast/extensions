import { JSX, useEffect, useState } from "react";
import { Icon, List, Toast, showToast } from "@raycast/api";
import DiskSection, { parseDiskSections } from "./features/disk/components/DiskSection";
import { SizesView, cycleSizesView, loadSizesView, saveSizesView } from "./utils/sizesViewUtils";
import { execDiskCommand } from "./utils/diskUtils";
import DiskListItem from "./features/disk/components/DiskListItem";

export default function ListDisks(): JSX.Element {
  const [diskSections, setDisksSections] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState({ show: false, detail: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sizesView, setSizesView] = useState<SizesView>(SizesView.Full);
  const [, setDiskUpdateTrigger] = useState(0);

  useEffect(() => {
    loadSizesView().then(setSizesView);
    fetchDisks("Init");
  }, []);

  async function updateDiskSections(update: "Init" | "Reload" | "Refresh") {
    setIsLoading(true);

    if (update === "Init") {
      showToast({ style: Toast.Style.Animated, title: "Initializing..." });
    }

    // Reload: Full reload with new disk instances (for eject/user refresh)
    // Refresh: Only re-initialize existing disks (for mount/unmount)
    const needsReload = update === "Init" || update === "Reload";

    let currentSections = diskSections;

    if (needsReload) {
      const diskOutput = await execDiskCommand("diskutil list");
      const newDiskSections = parseDiskSections(diskOutput);
      currentSections = newDiskSections;

      // Progressive load only for Init
      const isProgressiveLoad = update === "Init";

      if (isProgressiveLoad) {
        setDisksSections(newDiskSections);
      }

      await initializeDiskDetails(newDiskSections, isProgressiveLoad);

      if (!isProgressiveLoad) {
        setDisksSections(newDiskSections);
        setIsLoading(false);
      }
    } else {
      // Refresh existing disks in place
      await initializeDiskDetails(diskSections, false);
      setDiskUpdateTrigger((prev) => prev + 1); // Force re-render
      setIsLoading(false);
    }

    setIsLoading(false);

    // Show completion toast
    const totalDisks = currentSections.reduce((sum, section) => sum + section.disks.length, 0);
    const toastConfig = {
      Init: { title: "Initialized", message: `${totalDisks} disks loaded` },
      Reload: { title: "Reloaded", message: `${totalDisks} disks reloaded` },
      Refresh: { title: "Refreshed", message: "Mount status refreshed" },
    };
    const config = toastConfig[update];

    showToast({
      style: Toast.Style.Success,
      title: config.title,
      message: config.message,
    });
  }

  async function initializeDiskDetails(sections: DiskSection[], isProgressiveLoad: boolean) {
    const totalDisks = sections.reduce((sum, section) => sum + section.disks.length, 0);
    let completedDisks = 0;

    // Batching state: batch every 3 disks or every 100ms, whichever first
    let updateTimer: NodeJS.Timeout | null = null;
    let completedInBatch = 0;
    const BATCH_SIZE = 7;
    const BATCH_TIMEOUT_MS = 100;

    const triggerBatchUpdate = () => {
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }

      setDiskUpdateTrigger((prev) => prev + 1);
      showToast({
        style: Toast.Style.Animated,
        title: `Loading: ${completedDisks}/${totalDisks} disks`,
      });

      completedInBatch = 0;
    };

    const sectionInitPromises = sections.map((section) =>
      section.initDisks(() => {
        completedDisks++;
        completedInBatch++;

        if (isProgressiveLoad) {
          if (completedInBatch >= BATCH_SIZE) {
            triggerBatchUpdate();
            return;
          }

          if (completedDisks === totalDisks) {
            triggerBatchUpdate();
            return;
          }

          if (!updateTimer) {
            updateTimer = setTimeout(() => {
              triggerBatchUpdate();
            }, BATCH_TIMEOUT_MS);
          }
        }
      })
    );

    await Promise.allSettled(sectionInitPromises);

    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
  }

  function fetchDisks(update: "Init" | "Reload" | "Refresh") {
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
    section.disks.some((disk) => filter === "all" || disk.removable === (filter === "removable"))
  );

  return (
    <List
      isShowingDetail={showingDetail.show}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Disks" onChange={handleFilterChange} value={filter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Fixed" value="fixed" />
          <List.Dropdown.Item title="Removable" value="removable" />
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
          title={`No ${filter === "fixed" ? "Fixed" : "Removable"} Disks Found`}
          description={`Try changing the filter to see ${filter === "fixed" ? "removable" : "fixed"} disks.`}
        />
      ) : isLoading && !hasFilteredDisks ? (
        <List.EmptyView
          icon={Icon.Filter}
          title={`No ${filter === "fixed" ? "Fixed" : "Removable"} Disks Found`}
          description={`Try changing the filter to see ${filter === "fixed" ? "removable" : "fixed"} disks.`}
        />
      ) : (
        diskSections.map((section, index) => (
          <List.Section key={index} title={section.sectionName}>
            {section.disks
              .filter((disk) => filter === "all" || disk.removable === (filter === "removable"))
              .map((disk, diskIndex) => (
                <DiskListItem
                  key={diskIndex}
                  disk={disk}
                  showingDetail={showingDetail}
                  sizesView={sizesView}
                  onToggleDetail={(detailType) => setShowingDetail({ show: !showingDetail.show, detail: detailType })}
                  onRefresh={(type) => fetchDisks(type)}
                  onToggleSizesView={toggleSizesView}
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
