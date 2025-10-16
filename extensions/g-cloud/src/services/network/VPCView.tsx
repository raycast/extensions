import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, Toast, showToast, Form, useNavigation, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NetworkService, VPC } from "./NetworkService";
import SubnetsView from "./SubnetsView";
import FirewallRulesView from "./FirewallRulesView";

interface VPCViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function VPCView({ projectId, gcloudPath }: VPCViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vpcs, setVPCs] = useState<VPC[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading VPC networks...",
        message: "Please wait while we fetch your VPC networks",
      });

      try {
        const fetchedVPCs = await networkService.getVPCs();
        setVPCs(fetchedVPCs);

        networkService.getSubnets().catch((error) => {
          console.error("Background subnet fetch error:", error);
          showFailureToast("Failed to prefetch subnets - subnet view may load slower");
        });

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "VPCs loaded",
          message: `${fetchedVPCs.length} VPC networks found`,
        });
      } catch (error: unknown) {
        console.error("Error initializing:", error);
        loadingToast.hide();

        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load VPCs",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);

  const refreshVPCs = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing VPC networks...",
    });

    try {
      const fetchedVPCs = await service.getVPCs();
      setVPCs(fetchedVPCs);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "VPCs refreshed",
        message: `${fetchedVPCs.length} VPC networks found`,
      });
    } catch (error: unknown) {
      console.error("Error refreshing VPCs:", error);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Refresh VPCs",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const formatSubnetMode = (autoCreateSubnetworks: boolean) => {
    return autoCreateSubnetworks ? "Auto mode" : "Custom mode";
  };

  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRoutingMode = (vpc: VPC) => {
    if (!vpc.routingConfig || !vpc.routingConfig.routingMode) return "Regional";
    return vpc.routingConfig.routingMode === "REGIONAL" ? "Regional" : "Global";
  };

  const getSubnetModeIcon = (autoCreateSubnetworks: boolean) => {
    return {
      source: Icon.Network,
      tintColor: autoCreateSubnetworks ? Color.Green : Color.Orange,
    };
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search VPC networks..."
      navigationTitle="VPC Networks"
      filtering={true}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshVPCs}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Create Vpc Network"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              if (!service) return;
              push(
                <CreateVPCForm
                  service={service}
                  gcloudPath={gcloudPath}
                  projectId={projectId}
                  onVPCCreated={refreshVPCs}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      {vpcs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No VPC Networks Found"
          description={searchText ? "Try a different search term" : "Click the + button to create a new VPC network"}
          icon={{ source: Icon.Network }}
          actions={
            <ActionPanel>
              <Action
                title="Create Vpc Network"
                icon={Icon.Plus}
                onAction={() => {
                  if (!service) return;
                  push(
                    <CreateVPCForm
                      service={service}
                      gcloudPath={gcloudPath}
                      projectId={projectId}
                      onVPCCreated={refreshVPCs}
                    />,
                  );
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshVPCs} />
            </ActionPanel>
          }
        />
      ) : (
        vpcs.map((vpc) => (
          <List.Item
            key={`${vpc.id}-${vpc.name}-${vpc.creationTimestamp}`}
            title={vpc.name}
            subtitle={vpc.description || ""}
            accessories={[
              {
                text: formatSubnetMode(vpc.autoCreateSubnetworks),
                icon: getSubnetModeIcon(vpc.autoCreateSubnetworks),
              },
              { text: formatRoutingMode(vpc) },
              { text: `MTU: ${vpc.mtu || "Default"}` },
            ]}
            icon={{ source: Icon.Network }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Network Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={vpc.name} />
                    <List.Item.Detail.Metadata.Label title="Description" text={vpc.description || "No description"} />
                    <List.Item.Detail.Metadata.Label title="ID" text={vpc.id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Network Configuration" />
                    <List.Item.Detail.Metadata.Label
                      title="Subnet Mode"
                      text={formatSubnetMode(vpc.autoCreateSubnetworks)}
                      icon={getSubnetModeIcon(vpc.autoCreateSubnetworks)}
                    />
                    <List.Item.Detail.Metadata.Label title="Routing Mode" text={formatRoutingMode(vpc)} />
                    <List.Item.Detail.Metadata.Label title="MTU" text={vpc.mtu?.toString() || "Default"} />
                    {vpc.gatewayIPv4 && <List.Item.Detail.Metadata.Label title="Gateway IPv4" text={vpc.gatewayIPv4} />}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatCreationTime(vpc.creationTimestamp)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="View Subnets"
                  icon={Icon.List}
                  onAction={() => {
                    push(<SubnetsView projectId={projectId} gcloudPath={gcloudPath} vpc={vpc} />);
                  }}
                />
                <Action
                  title="View Firewall Rules"
                  icon={Icon.List}
                  onAction={() => {
                    push(<FirewallRulesView projectId={projectId} gcloudPath={gcloudPath} />);
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshVPCs}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Create Vpc Network"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    if (!service) return;
                    push(
                      <CreateVPCForm
                        service={service}
                        gcloudPath={gcloudPath}
                        projectId={projectId}
                        onVPCCreated={refreshVPCs}
                      />,
                    );
                  }}
                />
                <Action title="Copy Name" icon={Icon.CopyClipboard} onAction={() => Clipboard.copy(vpc.name)} />
                <Action title="Copy Id" icon={Icon.CopyClipboard} onAction={() => Clipboard.copy(vpc.id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface CreateVPCFormProps {
  gcloudPath: string;
  projectId: string;
  onVPCCreated: () => void;
  service: NetworkService;
}

function CreateVPCForm({ service, onVPCCreated }: CreateVPCFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(values: { name: string; description: string; subnetMode: string; mtu: string }) {
    if (!values.name) {
      showFailureToast("Please enter a network name");
      return;
    }

    let mtuValue: number | undefined;
    if (values.mtu) {
      if (!/^\d+$/.test(values.mtu)) {
        showFailureToast("MTU must be a valid number");
        return;
      }
      mtuValue = parseInt(values.mtu);
      if (isNaN(mtuValue) || mtuValue < 1300 || mtuValue > 8896) {
        showFailureToast("MTU must be between 1300 and 8896");
        return;
      }
    }

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating VPC network...",
      message: `Creating ${values.name}`,
    });

    try {
      const success = await service.createVPC(
        values.name,
        values.description,
        values.subnetMode as "auto" | "custom",
        mtuValue,
      );

      loadingToast.hide();

      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "VPC Network Created",
          message: `Successfully created ${values.name}`,
        });

        onVPCCreated();
        pop();
      } else {
        showFailureToast("An error occurred while creating the VPC network");
      }
    } catch (error: unknown) {
      console.error("Error creating VPC:", error);
      loadingToast.hide();
      showFailureToast(error instanceof Error ? error.message : "Failed to create VPC network");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Create VPC Network"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Vpc Network" onSubmit={handleSubmit} icon={Icon.Network} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Network Name"
        placeholder="my-vpc-network"
        info="The name of the new VPC network"
        autoFocus
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        info="A human-readable description for this VPC network"
      />
      <Form.Dropdown
        id="subnetMode"
        title="Subnet Mode"
        defaultValue="auto"
        info="Auto mode creates subnets automatically in each region"
      >
        <Form.Dropdown.Item value="auto" title="Auto Mode" />
        <Form.Dropdown.Item value="custom" title="Custom Mode" />
      </Form.Dropdown>
      <Form.TextField
        id="mtu"
        title="MTU"
        placeholder="1460"
        info="Maximum Transmission Unit (MTU) in bytes (default 1460)"
      />
    </Form>
  );
}
