import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, Toast, showToast, Form, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NetworkService, Subnet, VPC } from "./NetworkService";
import { getAllRegions, getRegionByName } from "../../utils/regions";

interface SubnetsViewProps {
  projectId: string;
  gcloudPath: string;
  vpc: VPC;
}

export default function SubnetsView({ projectId, gcloudPath, vpc }: SubnetsViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading subnets...",
        message: `Please wait while we fetch subnets for ${vpc.name}`,
      });

      try {
        const fetchedSubnets = await networkService.getSubnets();

        const filteredSubnets = fetchedSubnets.filter(
          (subnet) => subnet.network.includes(`/${vpc.name}`) || subnet.network === vpc.name,
        );

        setSubnets(filteredSubnets);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "Subnets loaded",
          message: `${filteredSubnets.length} subnets found for ${vpc.name}`,
        });
      } catch (error: unknown) {
        console.error("Error initializing:", error);
        loadingToast.hide();

        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Subnets",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId, vpc]);

  const refreshSubnets = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing subnets...",
    });

    try {
      await service.forceRefreshSubnets();

      const fetchedSubnets = await service.getSubnets();

      const filteredSubnets = fetchedSubnets.filter(
        (subnet) => subnet.network.includes(`/${vpc.name}`) || subnet.network === vpc.name,
      );

      setSubnets(filteredSubnets);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Subnets refreshed",
        message: `${filteredSubnets.length} subnets found for ${vpc.name}`,
      });
    } catch (error: unknown) {
      console.error("Error refreshing subnets:", error);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Refresh Subnets",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [service, vpc]);

  const filteredSubnets = subnets.filter(
    (subnet) =>
      subnet.name.toLowerCase().includes(searchText.toLowerCase()) ||
      subnet.region.toLowerCase().includes(searchText.toLowerCase()) ||
      subnet.ipCidrRange.includes(searchText),
  );

  const formatRegion = (regionPath: string) => {
    if (!service) return regionPath;
    return service.formatRegion(regionPath);
  };

  const formatNetwork = (networkPath: string) => {
    if (!service) return networkPath;
    return service.formatNetwork(networkPath);
  };

  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPrivateGoogleAccessIcon = (enabled: boolean) => {
    return {
      source: Icon.LockUnlocked,
      tintColor: enabled ? Color.Green : Color.SecondaryText,
    };
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Subnets for ${vpc.name}`}
      searchBarPlaceholder="Search subnets by name, region, or CIDR range..."
      onSearchTextChange={setSearchText}
    >
      {filteredSubnets.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Subnets Found"
          description={searchText ? "Try a different search term" : `No subnets found for ${vpc.name}`}
          icon={{ source: Icon.WifiDisabled }}
          actions={
            <ActionPanel>
              <Action
                title="Create Subnet"
                icon={Icon.Plus}
                onAction={() => {
                  push(
                    <CreateSubnetForm
                      gcloudPath={gcloudPath}
                      projectId={projectId}
                      vpc={vpc}
                      onSubnetCreated={refreshSubnets}
                    />,
                  );
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshSubnets} />
            </ActionPanel>
          }
        />
      ) : (
        filteredSubnets.map((subnet) => (
          <List.Item
            key={subnet.id || subnet.name}
            title={subnet.name}
            subtitle={subnet.ipCidrRange}
            accessories={[
              {
                text: formatRegion(subnet.region),
                icon: { source: Icon.Globe },
              },
              {
                text: subnet.privateIpGoogleAccess ? "Private Google Access" : "",
                icon: getPrivateGoogleAccessIcon(subnet.privateIpGoogleAccess),
              },
            ]}
            icon={{ source: Icon.Network }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Subnet Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={subnet.name} />
                    <List.Item.Detail.Metadata.Label title="Network" text={formatNetwork(subnet.network)} />
                    <List.Item.Detail.Metadata.Label title="Region" text={formatRegion(subnet.region)} />
                    <List.Item.Detail.Metadata.Label title="IP Range" text={subnet.ipCidrRange} />
                    <List.Item.Detail.Metadata.Label
                      title="Gateway Address"
                      text={subnet.gatewayAddress || "Not specified"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Configuration" />
                    <List.Item.Detail.Metadata.Label
                      title="Private Google Access"
                      text={subnet.privateIpGoogleAccess ? "Enabled" : "Disabled"}
                      icon={getPrivateGoogleAccessIcon(subnet.privateIpGoogleAccess)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Flow Logs"
                      text={subnet.enableFlowLogs ? "Enabled" : "Disabled"}
                    />
                    {subnet.secondaryIpRanges && subnet.secondaryIpRanges.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Secondary IP Ranges" />
                        {subnet.secondaryIpRanges.map((range, index) => (
                          <List.Item.Detail.Metadata.Label
                            key={`range-${index}`}
                            title={range.rangeName}
                            text={range.ipCidrRange}
                          />
                        ))}
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={formatCreationTime(subnet.creationTimestamp)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshSubnets}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Create Subnet"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    push(
                      <CreateSubnetForm
                        gcloudPath={gcloudPath}
                        projectId={projectId}
                        vpc={vpc}
                        onSubnetCreated={refreshSubnets}
                      />,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

function isValidCIDR(cidr: string): { valid: boolean; error?: string } {
  if (!cidr) {
    return { valid: false, error: "CIDR range cannot be empty" };
  }

  if (!CIDR_REGEX.test(cidr)) {
    return { valid: false, error: "Invalid CIDR format. Expected format: xxx.xxx.xxx.xxx/xx" };
  }

  const [ip, prefix] = cidr.split("/");
  const octets = ip.split(".").map(Number);

  if (octets.some((octet) => isNaN(octet) || octet < 0 || octet > 255)) {
    return { valid: false, error: "IP address octets must be between 0 and 255" };
  }

  const prefixNum = Number(prefix);
  if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) {
    return { valid: false, error: "Network prefix must be between 0 and 32" };
  }

  return { valid: true };
}

function validateSecondaryRanges(input: string): {
  valid: boolean;
  ranges?: { rangeName: string; ipCidrRange: string }[];
  error?: string;
} {
  if (!input.trim()) return { valid: true, ranges: undefined };

  try {
    const ranges = input.split(",").map((range) => {
      const [name, cidr] = range.split(":");

      if (!name || !cidr) {
        throw new Error(`Invalid format for range "${range}". Expected "name:cidr"`);
      }

      const trimmedName = name.trim();
      const trimmedCIDR = cidr.trim();

      if (!trimmedName) {
        throw new Error("Range name cannot be empty");
      }

      const cidrValidation = isValidCIDR(trimmedCIDR);
      if (!cidrValidation.valid) {
        throw new Error(`Invalid CIDR for range "${trimmedName}": ${cidrValidation.error}`);
      }

      return {
        rangeName: trimmedName,
        ipCidrRange: trimmedCIDR,
      };
    });

    return { valid: true, ranges };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid secondary range format",
    };
  }
}

interface CreateSubnetFormProps {
  gcloudPath: string;
  projectId: string;
  vpc: VPC;
  onSubnetCreated: () => void;
}

function CreateSubnetForm({ gcloudPath, projectId, vpc, onSubnetCreated }: CreateSubnetFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [regions] = useState<string[]>(getAllRegions());

  async function handleSubmit(values: {
    name: string;
    region: string;
    ipRange: string;
    privateGoogleAccess: boolean;
    enableFlowLogs: boolean;
    secondaryRanges?: string;
  }) {
    if (!values.name) {
      showFailureToast("Please enter a subnet name");
      return;
    }

    if (!values.ipRange) {
      showFailureToast("IP Range is required");
      return;
    }

    const ipRangeValidation = isValidCIDR(values.ipRange);
    if (!ipRangeValidation.valid) {
      showFailureToast(ipRangeValidation.error || "Invalid IP range format");
      return;
    }

    if (values.secondaryRanges) {
      const validation = validateSecondaryRanges(values.secondaryRanges);
      if (!validation.valid) {
        showFailureToast(validation.error || "Invalid secondary range format");
        return;
      }
    }

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating subnet...",
      message: `Creating ${values.name} in ${values.region}`,
    });

    try {
      const service = new NetworkService(gcloudPath, projectId);

      const { ranges: secondaryRanges } = values.secondaryRanges
        ? validateSecondaryRanges(values.secondaryRanges)
        : { ranges: undefined };

      const success = await service.createSubnet(
        values.name,
        vpc.name,
        values.region,
        values.ipRange,
        values.privateGoogleAccess,
        values.enableFlowLogs,
        secondaryRanges,
      );

      if (!success) {
        loadingToast.hide();
        showFailureToast("Failed to create subnet");
        return;
      }

      await service.forceRefreshSubnets();

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Subnet Created",
        message: `Successfully created ${values.name} in ${values.region}`,
      });

      onSubnetCreated();
      pop();
    } catch (error: unknown) {
      console.error("Error creating subnet:", error);
      loadingToast.hide();
      showFailureToast(error instanceof Error ? error.message : "Failed to create subnet");
    } finally {
      setIsLoading(false);
    }
  }

  const formatRegionForDropdown = (regionName: string): string => {
    const regionDetails = getRegionByName(regionName);
    return regionDetails ? `${regionName} (${regionDetails.description})` : regionName;
  };

  return (
    <Form
      navigationTitle="Create Subnet"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Subnet" onSubmit={handleSubmit} icon={Icon.Network} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Subnet Name"
        placeholder="my-subnet"
        info="The name of the new subnet"
        autoFocus
      />
      <Form.Dropdown
        id="region"
        title="Region"
        info="The region where the subnet will be created"
        defaultValue={regions[0]}
      >
        {regions.map((region) => (
          <Form.Dropdown.Item key={region} value={region} title={formatRegionForDropdown(region)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="ipRange"
        title="IP Range"
        placeholder="10.0.0.0/24"
        info="IP range in CIDR format (e.g., 10.0.0.0/24)"
      />
      <Form.Checkbox
        id="privateGoogleAccess"
        label="Enable Private Google Access"
        info="Allows VMs in this subnet to reach Google APIs and services using private IP addresses"
      />
      <Form.Checkbox id="enableFlowLogs" label="Enable Flow Logs" info="Enables VPC flow logs for network monitoring" />
      <Form.TextField
        id="secondaryRanges"
        title="Secondary Ranges (Optional)"
        placeholder="services:10.0.1.0/24,pods:10.0.2.0/24"
        info="Format: name:cidr,name:cidr"
      />
    </Form>
  );
}
