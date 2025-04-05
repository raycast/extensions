import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { ComputeService, ComputeInstance } from "./ComputeService";
import ComputeInstanceDetailView from "./ComputeInstanceDetailView";
import CreateVMForm from "./components/CreateVMForm";

interface ComputeInstancesViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ComputeInstancesView({ projectId, gcloudPath }: ComputeInstancesViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [filteredInstances, setFilteredInstances] = useState<ComputeInstance[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<string[]>([]);
  const [service, setService] = useState<ComputeService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const computeService = new ComputeService(gcloudPath, projectId);
    setService(computeService);

    const initializeData = async () => {
      // Show initial loading toast
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Loading Compute Engine instances...",
        message: "Please wait while we fetch your instances",
      });

      try {
        // Set loading state immediately to show user something is happening
        setIsLoading(true);

        // Try to fetch instances with a timeout
        const fetchPromise = computeService.getInstances();

        // Set a timeout of 30 seconds to avoid UI hanging indefinitely
        const timeoutPromise = new Promise<ComputeInstance[]>((_, reject) => {
          setTimeout(() => reject(new Error("Fetch timeout - service may be unavailable")), 30000);
        });

        // Race the promises - use whichever completes first
        const fetchedInstances = await Promise.race<ComputeInstance[]>([fetchPromise, timeoutPromise]);

        setInstances(fetchedInstances);

        // Then fetch zones in the background
        fetchZones(computeService);

        loadingToast.then((toast) => toast.hide());

        if (fetchedInstances.length === 0) {
          // If no instances found, show a more informative message
          showToast({
            style: Toast.Style.Success,
            title: "No instances found",
            message: "This project has no Compute Engine instances",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Instances loaded",
            message: `${fetchedInstances.length} instances found`,
          });
        }
      } catch (error: unknown) {
        console.error("Error initializing:", error);
        loadingToast.then((toast) => toast.hide());

        // Show more informative error message based on error type
        if (error instanceof Error && error.message.includes("timeout")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Request Timed Out",
            message: "Try again or check your connection",
          });
        } else if (error instanceof Error && error.message.includes("Authentication")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication Error",
            message: "Please re-authenticate with Google Cloud",
          });
        } else {
          // Generic error message
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load instances",
            message: error instanceof Error ? error.message : "An unknown error occurred",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);

  useEffect(() => {
    // Filter instances whenever searchText or instances change
    const filtered = instances.filter((instance) => {
      const searchLower = searchText.toLowerCase();
      return (
        instance.name.toLowerCase().includes(searchLower) ||
        instance.status.toLowerCase().includes(searchLower) ||
        service?.formatZone(instance.zone).toLowerCase().includes(searchLower) ||
        service?.formatMachineType(instance.machineType).toLowerCase().includes(searchLower) ||
        instance.networkInterfaces?.[0]?.networkIP?.toLowerCase().includes(searchLower) ||
        instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredInstances(filtered);
  }, [searchText, instances]);

  const fetchZones = async (computeService: ComputeService) => {
    try {
      const zonesList = await computeService.listZones();
      setZones(zonesList);
    } catch (error) {
      console.error("Error fetching zones:", error);
      // Don't show errors for background fetches to avoid overwhelming the user
    }
  };

  const fetchInstances = async (computeService: ComputeService) => {
    try {
      setIsLoading(true);

      const fetchingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing instances...",
      });

      // Fetch instances based on selected zone or all zones
      const fetchedInstances = await computeService.getInstances(selectedZone);

      setInstances(fetchedInstances);

      fetchingToast.hide();

      // Show toast with number of instances found
      showToast({
        style: Toast.Style.Success,
        title: "Instances refreshed",
        message: `${fetchedInstances.length} instances found`,
      });
    } catch (error: unknown) {
      console.error("Error fetching instances:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh instances",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneChange = async (newZone: string | undefined) => {
    if (newZone === selectedZone) {
      return; // No change
    }

    setSelectedZone(newZone);

    if (!service) {
      return;
    }

    try {
      setIsLoading(true);

      const fetchingToast = await showToast({
        style: Toast.Style.Animated,
        title: newZone ? `Loading instances in ${newZone}...` : "Loading instances in all zones...",
      });

      // Fetch instances based on selected zone or all zones
      const fetchedInstances = await service.getInstances(newZone);

      setInstances(fetchedInstances);

      fetchingToast.hide();

      // Show toast with number of instances found
      showToast({
        style: Toast.Style.Success,
        title: "Instances loaded",
        message: `${fetchedInstances.length} instances found`,
      });
    } catch (error: unknown) {
      console.error("Error fetching instances:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load instances",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startInstance = async (instance: ComputeInstance) => {
    if (!service) {
      showToast({
        style: Toast.Style.Failure,
        title: "Service not initialized",
        message: "Please try again",
      });
      return;
    }

    try {
      const zone = service.formatZone(instance.zone);
      const name = instance.name;

      const confirmationResponse = await confirmAlert({
        title: "Start Instance",
        message: `Are you sure you want to start the instance ${name}?`,
        primaryAction: {
          title: "Start",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!confirmationResponse) {
        return;
      }

      const startingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Starting instance ${name}...`,
        message: `Zone: ${zone}`,
      });

      await service.startInstance(name, zone);

      startingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Instance started",
        message: `${name} is starting. It may take a few moments to be ready.`,
      });

      // Refresh instances after a short delay to allow the status to update
      setTimeout(() => fetchInstances(service), 3000);
    } catch (error: unknown) {
      console.error("Error starting instance:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start instance",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const stopInstance = async (instance: ComputeInstance) => {
    if (!service) {
      showToast({
        style: Toast.Style.Failure,
        title: "Service not initialized",
        message: "Please try again",
      });
      return;
    }

    try {
      const zone = service.formatZone(instance.zone);
      const name = instance.name;

      const confirmationResponse = await confirmAlert({
        title: "Stop Instance",
        message: `Are you sure you want to stop the instance ${name}?`,
        primaryAction: {
          title: "Stop",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmationResponse) {
        return;
      }

      const stoppingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Stopping instance ${name}...`,
        message: `Zone: ${zone}`,
      });

      await service.stopInstance(name, zone);

      stoppingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Instance stopped",
        message: `${name} is stopping. It may take a few moments to stop completely.`,
      });

      // Refresh instances after a short delay to allow the status to update
      setTimeout(() => fetchInstances(service), 3000);
    } catch (error: unknown) {
      console.error("Error stopping instance:", error);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop instance",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const viewInstanceDetails = (instance: ComputeInstance) => {
    if (!service) {
      return;
    }

    push(
      <ComputeInstanceDetailView
        instance={instance}
        service={service}
        onRefresh={() => fetchInstances(service)}
        projectId={projectId}
      />,
    );
  };

  const copyConnectionCommand = (instance: ComputeInstance) => {
    if (!service) {
      return;
    }

    const zone = service.formatZone(instance.zone).split("/").pop() || "";
    const command = `gcloud compute ssh --zone="${zone}" "${instance.name}" --project="${projectId}"`;

    Clipboard.copy(command);
    showToast({
      style: Toast.Style.Success,
      title: "Connection command copied",
      message: "Paste in your terminal to connect",
    });
  };

  const createVMInstance = async () => {
    if (!service) {
      return;
    }

    const createdCallback = async () => {
      // Show loading toast while refreshing
      const refreshToast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing VM instances...",
        message: "Loading updated instance list",
      });

      try {
        // Refresh the instances
        await fetchInstances(service);
        refreshToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "VM instances refreshed",
          message: "Instance list updated",
        });
      } catch (error) {
        refreshToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh instances",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    push(<CreateVMForm projectId={projectId} gcloudPath={gcloudPath} onVMCreated={createdCallback} />);
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "running") {
      return { source: Icon.Circle, tintColor: Color.Green };
    } else if (lowerStatus === "terminated" || lowerStatus === "stopped") {
      return { source: Icon.Circle, tintColor: Color.Red };
    } else if (lowerStatus === "stopping" || lowerStatus === "starting") {
      return { source: Icon.Circle, tintColor: Color.Orange };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search VM instances..."
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Compute Engine Instances"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Zone"
          value={selectedZone || "all"}
          onChange={(newValue) => handleZoneChange(newValue === "all" ? undefined : newValue)}
        >
          <List.Dropdown.Item title="All Zones" value="all" />
          {zones.map((zone) => (
            <List.Dropdown.Item key={zone} title={zone} value={zone} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No VM instances found"
        description={isLoading ? "Loading instances..." : "No VM instances found in the selected zone"}
        icon={{ source: Icon.Desktop, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action title="Create Vm Instance" icon={Icon.Plus} onAction={createVMInstance} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => service && fetchInstances(service)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
      {service && (
        <List.Section
          title="VM Instances"
          subtitle={filteredInstances.length > 0 ? `${filteredInstances.length} instances` : undefined}
        >
          {filteredInstances.map((instance) => {
            const zone = service.formatZone(instance.zone);
            const machineType = service.formatMachineType(instance.machineType);
            const networkIP = instance.networkInterfaces?.[0]?.networkIP || "No IP";
            const externalIP = instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || "No external IP";

            return (
              <List.Item
                key={instance.id}
                title={instance.name}
                subtitle={`${machineType} in ${zone}`}
                accessories={[
                  { text: instance.status, icon: getStatusIcon(instance.status) },
                  { text: externalIP !== "No external IP" ? externalIP : networkIP },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Instance Actions">
                      <Action
                        title="View Instance Details"
                        icon={Icon.Eye}
                        onAction={() => viewInstanceDetails(instance)}
                      />
                      {instance.status.toLowerCase() === "running" && (
                        <Action
                          title="Copy Connection Command"
                          icon={Icon.Terminal}
                          onAction={() => copyConnectionCommand(instance)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                      )}
                      {instance.status.toLowerCase() === "running" ? (
                        <Action
                          title="Stop Instance"
                          icon={{ source: Icon.Stop, tintColor: Color.Red }}
                          onAction={() => stopInstance(instance)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        />
                      ) : (
                        instance.status.toLowerCase() === "terminated" && (
                          <Action
                            title="Start Instance"
                            icon={{ source: Icon.Play, tintColor: Color.Green }}
                            onAction={() => startInstance(instance)}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          />
                        )
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Management">
                      <Action
                        title="Create Vm Instance"
                        icon={Icon.Plus}
                        onAction={createVMInstance}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={() => fetchInstances(service)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                    <Action
                      title="Copy to Clipboard"
                      icon={Icon.CopyClipboard}
                      onAction={() => Clipboard.copy(instance.name)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
