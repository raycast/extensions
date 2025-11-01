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
import InstanceListItem from "./components/InstanceListItem";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { showFailureToast } from "@raycast/utils";

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

    return () => {
      // Cleanup
    };
  }, [projectId, gcloudPath]);

  useEffect(() => {
    if (!service || !instances.length) return;

    const hasTransitionalInstances = instances.some(
      (instance) => instance.status.toLowerCase() === "stopping" || instance.status.toLowerCase() === "starting",
    );

    if (!hasTransitionalInstances) return;

    const refreshTimer = setInterval(() => {
      //console.log("Auto-refreshing instances in transitional state...");
      fetchInstances(service);
    }, 30000);
    return () => clearInterval(refreshTimer);
  }, [instances, service]);

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
    }
  };

  const fetchInstances = async (computeService: ComputeService) => {
    try {
      setIsLoading(true);

      const fetchingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing instances...",
      });

      const fetchedInstances = await computeService.getInstances(selectedZone);

      setInstances(fetchedInstances);

      fetchingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Instances refreshed",
        message: `${fetchedInstances.length} instances found`,
      });
    } catch (error: unknown) {
      console.error("Error fetching instances:", error);
      showFailureToast({
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
      showFailureToast({
        title: "Failed to load instances",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startInstance = async (instance: ComputeInstance) => {
    if (!service) {
      showFailureToast({
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
      showFailureToast({
        title: "Failed to start instance",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const stopInstance = async (instance: ComputeInstance) => {
    if (!service) {
      showFailureToast({
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

      const result = await service.stopInstance(name, zone);

      stoppingToast.hide();

      if (result.success) {
        if (result.isTimedOut) {
          showToast({
            style: Toast.Style.Success,
            title: "Instance stopping",
            message: `${name} is in the process of stopping. This may take several minutes to complete.`,
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Instance stopped",
            message: `${name} is stopping. It may take a few moments to stop completely.`,
          });
        }

        // Force instance refresh immediately to show updated status
        await fetchInstances(service);

        // Schedule another refresh after a delay to catch final state
        setTimeout(() => fetchInstances(service), 10000);
      } else {
        showFailureToast({
          title: "Failed to stop instance",
          message: "An error occurred while trying to stop the VM",
        });
      }
    } catch (error: unknown) {
      console.error("Error stopping instance:", error);
      showFailureToast({
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

  async function createVMInstance() {
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
        showFailureToast({
          title: "Failed to refresh instances",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    push(<CreateVMForm projectId={projectId} gcloudPath={gcloudPath} onVMCreated={createdCallback} />);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search VM instances by name, zone, IP, etc..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`VM Instances - ${projectId}`}
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} />}
      actions={
        <ActionPanel>
          <Action title="Create Vm Instance" icon={{ source: Icon.Plus }} onAction={createVMInstance} />
          <Action
            title="Refresh Instances"
            icon={{ source: Icon.RotateClockwise }}
            onAction={() => service && fetchInstances(service)}
          />
          {selectedZone && (
            <Action
              title={`Clear Zone Filter: ${selectedZone}`}
              icon={{ source: Icon.XmarkCircle }}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleZoneChange(undefined)}
            />
          )}
          {zones.map((zone) => (
            <Action
              key={zone}
              title={`Zone: ${zone}`}
              icon={{ source: Icon.LightBulb }}
              onAction={() => handleZoneChange(zone)}
            />
          ))}
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: isLoading ? Icon.CircleProgress : Icon.Desktop, tintColor: Color.SecondaryText }}
        title={isLoading ? "Loading instances..." : "No instances found"}
        description={
          isLoading
            ? "Please wait while we fetch the VM instances"
            : "There are no VM instances in this project or zone. Create one to get started."
        }
      />

      {/* Instance sections by status */}
      <List.Section title="Running Instances">
        {filteredInstances
          .filter((instance) => instance.status.toLowerCase() === "running")
          .map((instance) => (
            <InstanceListItem
              key={instance.id}
              instance={instance}
              service={service}
              onViewDetails={viewInstanceDetails}
              onStart={startInstance}
              onStop={stopInstance}
              onSshCommand={copyConnectionCommand}
              onCreateVM={createVMInstance}
            />
          ))}
      </List.Section>

      <List.Section title="Other Instances">
        {filteredInstances
          .filter((instance) => instance.status.toLowerCase() !== "running")
          .map((instance) => (
            <InstanceListItem
              key={instance.id}
              instance={instance}
              service={service}
              onViewDetails={viewInstanceDetails}
              onStart={startInstance}
              onStop={stopInstance}
              onSshCommand={copyConnectionCommand}
              onCreateVM={createVMInstance}
            />
          ))}
      </List.Section>
    </List>
  );
}
