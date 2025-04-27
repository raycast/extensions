import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ComputeService, Disk } from "./ComputeService";

interface ComputeDisksViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ComputeDisksView({ projectId, gcloudPath }: ComputeDisksViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [disks, setDisks] = useState<Disk[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<ComputeService | null>(null);

  useEffect(() => {
    const computeService = new ComputeService(gcloudPath, projectId);
    setService(computeService);

    const initializeData = async () => {
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Loading Compute Engine disks...",
        message: "Please wait while we fetch your disks",
      });

      try {
        const fetchedDisks = await computeService.getDisks();
        setDisks(fetchedDisks);

        fetchZones(computeService);

        loadingToast.then((toast) => toast.hide());

        showToast({
          style: Toast.Style.Success,
          title: "Disks loaded",
          message: `${fetchedDisks.length} disks found`,
        });
      } catch (error: Error | unknown) {
        console.error("Error initializing:", error);
        loadingToast.then((toast) => toast.hide());
        showFailureToast({
          title: "Failed to Load Disks",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);

  const fetchZones = async (computeService: ComputeService) => {
    try {
      const zonesList = await computeService.listZones();
      setZones(zonesList);
    } catch (error: Error | unknown) {
      console.error("Error fetching zones:", error);
    }
  };

  const fetchDisks = async (computeService: ComputeService) => {
    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading disks...",
      message: selectedZone ? `Zone: ${selectedZone}` : "All zones",
    });

    try {
      const fetchedDisks = await computeService.getDisks(selectedZone);
      setDisks(fetchedDisks);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Disks loaded",
        message: `${fetchedDisks.length} disks found`,
      });
    } catch (error: Error | unknown) {
      console.error("Error fetching disks:", error);
      loadingToast.hide();
      showFailureToast({
        title: "Failed to Fetch Disks",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDisks = useCallback(async () => {
    if (!service) return;
    await fetchDisks(service);
  }, [service, fetchDisks]);

  const handleZoneChange = async (newZone: string | undefined) => {
    const zoneFilter = newZone === "all" ? undefined : newZone;
    setSelectedZone(zoneFilter);

    if (service) {
      try {
        setIsLoading(true);

        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Changing zone...",
          message: zoneFilter ? `Loading disks in ${zoneFilter}` : "Loading disks in all zones",
        });

        const fetchedDisks = await service.getDisks(zoneFilter);
        setDisks(fetchedDisks);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "Zone changed",
          message: `${fetchedDisks.length} disks found in ${zoneFilter || "all zones"}`,
        });
      } catch (error: Error | unknown) {
        console.error("Error fetching disks:", error);
        showFailureToast({
          title: "Zone Change Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredDisks = disks.filter((disk) => disk.name.toLowerCase().includes(searchText.toLowerCase()));

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "ready") return Color.Green;
    if (lowerStatus === "creating") return Color.Orange;
    return Color.PrimaryText;
  };

  const formatDiskSize = (sizeGb: string) => {
    return `${sizeGb} GB`;
  };

  const formatZone = (zone: string) => {
    const parts = zone.split("/");
    return parts[parts.length - 1];
  };

  const formatDiskType = (type: string) => {
    const parts = type.split("/");
    return parts[parts.length - 1];
  };

  const getAttachedToText = (users?: string[]) => {
    if (!users || users.length === 0) return "Not attached";

    return users
      .map((user) => {
        const parts = user.split("/");
        return parts[parts.length - 1];
      })
      .join(", ");
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search disks..."
      navigationTitle="Compute Engine Disks"
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Zone"
          value={selectedZone || "all"}
          onChange={(newValue) => handleZoneChange(newValue === "all" ? undefined : newValue)}
        >
          <List.Dropdown.Item title="All Zones" value="all" />
          {zones.length === 0 ? (
            <List.Dropdown.Item title="Loading zones..." value="loading" />
          ) : (
            zones.map((zone) => <List.Dropdown.Item key={zone} title={zone} value={zone} />)
          )}
        </List.Dropdown>
      }
    >
      {filteredDisks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Disks Found"
          description={searchText ? "Try a different search term" : "Try selecting a different zone"}
          icon={{ source: Icon.Document }}
        />
      ) : (
        filteredDisks.map((disk) => (
          <List.Item
            key={`${disk.name}-${disk.zone}`}
            title={disk.name}
            subtitle={formatDiskType(disk.type)}
            accessories={[
              { text: formatDiskSize(disk.sizeGb), tooltip: "Size" },
              { text: formatZone(disk.zone), tooltip: "Zone" },
              {
                text: disk.status,
                tooltip: "Status",
                icon: { source: Icon.Circle, tintColor: getStatusColor(disk.status) },
              },
            ]}
            icon={{ source: Icon.Document }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={disk.name} />
                    <List.Item.Detail.Metadata.Label title="ID" text={disk.id} />
                    <List.Item.Detail.Metadata.Label title="Size" text={formatDiskSize(disk.sizeGb)} />
                    <List.Item.Detail.Metadata.Label title="Zone" text={formatZone(disk.zone)} />
                    <List.Item.Detail.Metadata.Label title="Status" text={disk.status} />
                    <List.Item.Detail.Metadata.Label title="Type" text={formatDiskType(disk.type)} />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(disk.creationTimestamp).toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Attached To" text={getAttachedToText(disk.users)} />
                    {disk.sourceImage && (
                      <List.Item.Detail.Metadata.Label
                        title="Source Image"
                        text={disk.sourceImage.split("/").pop() || ""}
                      />
                    )}
                    {disk.description && (
                      <List.Item.Detail.Metadata.Label title="Description" text={disk.description} />
                    )}
                    {disk.labels && Object.keys(disk.labels).length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Labels" />
                        {Object.entries(disk.labels).map(([key, value]) => (
                          <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                        ))}
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Disk Actions">
                  <Action
                    title="Refresh Disks"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshDisks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
