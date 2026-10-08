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
import { friendlyErrorMessage } from "../../utils/errorMessages";
import { LogsView } from "../logs-service";
import { CloudShellAction } from "../../components/CloudShellAction";
import {
  ComputeLifecycleAction,
  getLifecycleActionConfirmation,
  getLifecycleActionFailureTitle,
  getLifecycleActionProgressToast,
  getLifecycleActionSuccessToast,
  getOptimisticStatusForAction,
  isInstanceTransitionalStatus,
} from "./instanceLifecycle";

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

        const friendly = friendlyErrorMessage(error, "Failed to load instances");
        showToast({
          style: Toast.Style.Failure,
          title: friendly.title,
          message: friendly.message,
        });
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

    const hasTransitionalInstances = instances.some((instance) => isInstanceTransitionalStatus(instance.status));

    if (!hasTransitionalInstances) return;

    const refreshTimer = setInterval(() => {
      fetchInstances(service, { silent: true });
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

  const fetchInstances = async (computeService: ComputeService, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      setIsLoading(true);

      const fetchingToast = silent
        ? null
        : await showToast({
            style: Toast.Style.Animated,
            title: "Refreshing instances...",
          });

      const fetchedInstances = await computeService.getInstances(selectedZone, { forceRefresh: true });

      setInstances(fetchedInstances);

      fetchingToast?.hide();

      if (!silent) {
        showToast({
          style: Toast.Style.Success,
          title: "Instances refreshed",
          message: `${fetchedInstances.length} instances found`,
        });
      }
    } catch (error: unknown) {
      console.error("Error fetching instances:", error);
      const friendly = friendlyErrorMessage(error, "Failed to refresh instances");
      showToast({
        style: Toast.Style.Failure,
        title: friendly.title,
        message: friendly.message,
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
      const fetchedInstances = await service.getInstances(newZone, { forceRefresh: true });

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
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runInstanceAction = async (instance: ComputeInstance, action: ComputeLifecycleAction) => {
    if (!service) {
      showToast({
        style: Toast.Style.Failure,
        title: "Service not initialized",
        message: "Please try again",
      });
      return;
    }

    const previousStatus = instance.status;

    try {
      const zone = service.formatZone(instance.zone);
      const name = instance.name;
      const confirmation = getLifecycleActionConfirmation(action, name);

      if (confirmation) {
        const confirmationResponse = await confirmAlert({
          title: confirmation.title,
          message: confirmation.message,
          primaryAction: {
            title: confirmation.actionTitle,
            style: confirmation.isDestructive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
          },
        });

        if (!confirmationResponse) {
          return;
        }
      }

      setInstances((prevInstances) =>
        prevInstances.map((inst) =>
          inst.id === instance.id ? { ...inst, status: getOptimisticStatusForAction(action) } : inst,
        ),
      );

      const progressToast = getLifecycleActionProgressToast(action, name, zone);
      const actionToast = await showToast({
        style: Toast.Style.Animated,
        title: progressToast.title,
        message: progressToast.message,
      });

      const result = await executeLifecycleAction(action, name, zone);

      actionToast.hide();

      const successToast = getLifecycleActionSuccessToast(action, name, result.isTimedOut);
      showToast({
        style: Toast.Style.Success,
        title: successToast.title,
        message: successToast.message,
      });

      if (result.instance) {
        setInstances((prevInstances) =>
          prevInstances.map((inst) => (inst.id === instance.id ? result.instance! : inst)),
        );
      }
      await fetchInstances(service, { silent: true });
    } catch (error: unknown) {
      console.error("Error running instance action:", error);
      setInstances((prevInstances) =>
        prevInstances.map((inst) => (inst.id === instance.id ? { ...inst, status: previousStatus } : inst)),
      );
      const friendly = friendlyErrorMessage(error, getLifecycleActionFailureTitle(action));
      showToast({
        style: Toast.Style.Failure,
        title: friendly.title,
        message: friendly.message,
      });
    }
  };

  const executeLifecycleAction = (action: ComputeLifecycleAction, name: string, zone: string) => {
    if (!service) {
      throw new Error("Service not initialized");
    }

    switch (action) {
      case "start":
        return service.startInstance(name, zone);
      case "resume":
        return service.resumeInstance(name, zone);
      case "stop":
        return service.stopInstance(name, zone);
      case "suspend":
        return service.suspendInstance(name, zone);
      case "restart":
        return service.restartInstance(name, zone);
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
        onRefresh={() => fetchInstances(service, { silent: true })}
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
        await fetchInstances(service, { silent: true });
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
          message: error instanceof Error ? error.message : "Unknown error",
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
          <Action
            title="View Logs"
            icon={Icon.Terminal}
            onAction={() =>
              push(<LogsView projectId={projectId} gcloudPath={gcloudPath} initialResourceType="gce_instance" />)
            }
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
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
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
              projectId={projectId}
              onViewDetails={viewInstanceDetails}
              onInstanceAction={runInstanceAction}
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
              projectId={projectId}
              onViewDetails={viewInstanceDetails}
              onInstanceAction={runInstanceAction}
              onSshCommand={copyConnectionCommand}
              onCreateVM={createVMInstance}
            />
          ))}
      </List.Section>
    </List>
  );
}
