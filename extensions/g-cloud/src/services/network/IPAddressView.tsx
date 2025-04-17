import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, Toast, showToast, Form, useNavigation, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NetworkService, IPAddress, NetworkServiceError } from "./NetworkService";

interface IPAddressViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function IPAddressView({ projectId, gcloudPath }: IPAddressViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ips, setIPs] = useState<IPAddress[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
  const [regions, setRegions] = useState<string[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IP addresses...",
        message: "Please wait while we fetch your IP addresses",
      });

      try {
        const fetchedIPs = await networkService.getIPs();
        setIPs(fetchedIPs);

        fetchRegions(networkService);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "IP addresses loaded",
          message: `${fetchedIPs.length} IP addresses found`,
        });
      } catch (error) {
        console.error("Error initializing:", error);
        loadingToast.hide();
        showFailureToast(error instanceof NetworkServiceError ? error.message : "Failed to load IP addresses");
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);

  const fetchRegions = async (networkService: NetworkService) => {
    try {
      const regionsList = await networkService.listRegions();
      setRegions(regionsList);
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  };

  const refreshIPs = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing IP addresses...",
      message: selectedRegion ? `Region: ${selectedRegion}` : "All regions",
    });

    try {
      const fetchedIPs = await service.getIPs(selectedRegion);
      setIPs(fetchedIPs);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "IP addresses refreshed",
        message: `${fetchedIPs.length} IP addresses found`,
      });
    } catch (error) {
      console.error("Error refreshing IPs:", error);
      loadingToast.hide();
      showFailureToast(error instanceof NetworkServiceError ? error.message : "Failed to refresh IP addresses");
    } finally {
      setIsLoading(false);
    }
  }, [service, selectedRegion]);

  const handleRegionChange = async (newRegion: string | undefined) => {
    const regionFilter = newRegion === "all" ? undefined : newRegion;
    setSelectedRegion(regionFilter);

    if (service) {
      try {
        setIsLoading(true);

        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Changing region...",
          message: regionFilter ? `Loading IP addresses in ${regionFilter}` : "Loading IP addresses in all regions",
        });

        const fetchedIPs = await service.getIPs(regionFilter);
        setIPs(fetchedIPs);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "Region changed",
          message: `${fetchedIPs.length} IP addresses found in ${regionFilter || "all regions"}`,
        });
      } catch (error) {
        console.error("Error fetching IPs:", error);
        showFailureToast(error instanceof NetworkServiceError ? error.message : "Failed to fetch IP addresses");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredIPs = ips.filter(
    (ip) =>
      ip.name.toLowerCase().includes(searchText.toLowerCase()) ||
      ip.address.toLowerCase().includes(searchText.toLowerCase()),
  );

  const formatAddressType = (type: string) => {
    return type === "EXTERNAL" ? "External" : "Internal";
  };

  const formatStatus = (status: string) => {
    return status === "RESERVED" ? "Reserved" : "In Use";
  };

  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRegion = (regionPath?: string) => {
    if (!regionPath) return "Global";
    const parts = regionPath.split("/");
    return parts[parts.length - 1];
  };

  const getStatusIcon = (status: string) => {
    return {
      source: Icon.Circle,
      tintColor: status === "RESERVED" ? Color.Green : Color.Blue,
    };
  };

  const getAddressTypeIcon = (type: string) => {
    return {
      source: type === "EXTERNAL" ? Icon.Globe : Icon.ComputerChip,
      tintColor: type === "EXTERNAL" ? Color.Purple : Color.Orange,
    };
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search IP addresses..."
      navigationTitle="IP Addresses"
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Region"
          value={selectedRegion || "all"}
          onChange={(newValue) => handleRegionChange(newValue === "all" ? undefined : newValue)}
        >
          <List.Dropdown.Item title="All Regions" value="all" />
          {regions.length === 0 ? (
            <List.Dropdown.Item title="Loading regions..." value="loading" />
          ) : (
            regions.map((region) => <List.Dropdown.Item key={region} title={region} value={region} />)
          )}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshIPs}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Create Ip Address"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              if (regions.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Cannot Create IP Address",
                  message: "Please wait for regions to be loaded",
                });
                return;
              }

              push(
                <CreateIPForm
                  gcloudPath={gcloudPath}
                  projectId={projectId}
                  regions={regions}
                  onIPCreated={refreshIPs}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      {filteredIPs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No IP Addresses Found"
          description={searchText ? "Try a different search term" : "Click the + button to create a new IP address"}
          icon={{ source: Icon.Globe }}
          actions={
            <ActionPanel>
              <Action
                title="Create Ip Address"
                icon={Icon.Plus}
                onAction={() => {
                  if (regions.length === 0) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Cannot Create IP Address",
                      message: "Please wait for regions to be loaded",
                    });
                    return;
                  }

                  push(
                    <CreateIPForm
                      gcloudPath={gcloudPath}
                      projectId={projectId}
                      regions={regions}
                      onIPCreated={refreshIPs}
                    />,
                  );
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshIPs} />
            </ActionPanel>
          }
        />
      ) : (
        filteredIPs.map((ip) => (
          <List.Item
            key={ip.id || ip.name}
            title={ip.name}
            subtitle={ip.address}
            accessories={[
              {
                text: formatAddressType(ip.addressType),
                icon: getAddressTypeIcon(ip.addressType),
                tooltip: "Address Type",
              },
              {
                text: formatStatus(ip.status),
                icon: getStatusIcon(ip.status),
                tooltip: "Status",
              },
              {
                text: formatRegion(ip.region),
                tooltip: "Region",
              },
            ]}
            icon={{ source: Icon.Network }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="IP Address Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={ip.name} />
                    <List.Item.Detail.Metadata.Label title="IP Address" text={ip.address} />
                    <List.Item.Detail.Metadata.Label title="Description" text={ip.description || "No description"} />
                    <List.Item.Detail.Metadata.Label title="ID" text={ip.id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Configuration" />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={formatAddressType(ip.addressType)}
                      icon={getAddressTypeIcon(ip.addressType)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={formatStatus(ip.status)}
                      icon={getStatusIcon(ip.status)}
                    />
                    <List.Item.Detail.Metadata.Label title="Region" text={formatRegion(ip.region)} />
                    {ip.purpose && <List.Item.Detail.Metadata.Label title="Purpose" text={ip.purpose} />}
                    {ip.network && (
                      <List.Item.Detail.Metadata.Label
                        title="Network"
                        text={service?.formatNetwork(ip.network) || ip.network}
                      />
                    )}
                    {ip.subnetwork && <List.Item.Detail.Metadata.Label title="Subnetwork" text={ip.subnetwork} />}
                    <List.Item.Detail.Metadata.Separator />
                    {ip.users && ip.users.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Used By" />
                        {ip.users.map((user, index) => (
                          <List.Item.Detail.Metadata.Label key={index} title={`Resource ${index + 1}`} text={user} />
                        ))}
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label title="Created" text={formatCreationTime(ip.creationTimestamp)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.CopyClipboard}
                  onAction={() => Clipboard.copy(ip.address)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshIPs}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Create Ip Address"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    if (regions.length === 0) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Cannot Create IP Address",
                        message: "Please wait for regions to be loaded",
                      });
                      return;
                    }

                    push(
                      <CreateIPForm
                        gcloudPath={gcloudPath}
                        projectId={projectId}
                        regions={regions}
                        onIPCreated={refreshIPs}
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

interface CreateIPFormProps {
  gcloudPath: string;
  projectId: string;
  regions: string[];
  onIPCreated: () => void;
}

function CreateIPForm({ gcloudPath, projectId, regions, onIPCreated }: CreateIPFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [addressType, setAddressType] = useState<string>("EXTERNAL");
  const [subnets, setSubnets] = useState<{ name: string; region: string }[]>([]);
  const [vpcs, setVPCs] = useState<{ name: string }[]>([]);
  const [selectedSubnet, setSelectedSubnet] = useState<string>("");
  const [ipSuggestions, setIpSuggestions] = useState<string[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState<boolean>(false);
  const [selectedIpAddress, setSelectedIpAddress] = useState<string>("");

  useEffect(() => {
    const fetchNetworkResources = async () => {
      try {
        const service = new NetworkService(gcloudPath, projectId);

        const allSubnets = await service.getSubnets();
        const formattedSubnets = allSubnets.map((subnet) => ({
          name: subnet.name,
          region: service.formatRegion(subnet.region),
        }));
        setSubnets(formattedSubnets);

        const allVPCs = await service.getVPCs();
        const formattedVPCs = allVPCs.map((vpc) => ({
          name: vpc.name,
        }));
        setVPCs(formattedVPCs);
      } catch (error) {
        console.error("Error fetching network resources:", error);
      }
    };

    fetchNetworkResources();
  }, [gcloudPath, projectId]);

  const fetchIPSuggestions = async (type: string, subnet?: string) => {
    try {
      setFetchingSuggestions(true);
      const service = new NetworkService(gcloudPath, projectId);
      const suggestions = await service.generateAvailableIPSuggestions(type as "INTERNAL" | "EXTERNAL", subnet);
      setIpSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching IP suggestions:", error);
    } finally {
      setFetchingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchIPSuggestions(addressType, selectedSubnet);
  }, [addressType, selectedSubnet]);

  async function handleSubmit(values: {
    name: string;
    description: string;
    region?: string;
    addressType: string;
    subnet?: string;
    network?: string;
    specificAddress?: string;
    purpose?: string;
    ephemeral?: boolean;
    networkTier?: string;
  }) {
    if (!values.name) {
      showFailureToast("Please enter an IP address name");
      return;
    }

    if (!values.region) {
      showFailureToast("Please select a region for the IP address");
      return;
    }

    if (values.addressType === "INTERNAL" && !values.subnet) {
      showFailureToast("Please select a subnet for internal IP address");
      return;
    }

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating IP address...",
      message: `Creating ${values.name} (${values.addressType === "EXTERNAL" ? "External" : "Internal"} - ${values.region})`,
    });

    try {
      const service = new NetworkService(gcloudPath, projectId);

      const success = await service.createIP(
        values.name,
        values.region,
        values.addressType as "INTERNAL" | "EXTERNAL",
        {
          description: values.description,
          subnet: values.subnet,
          network: values.network,
          address: values.specificAddress,
          purpose: values.purpose,
          ephemeral: values.ephemeral,
          networkTier: values.networkTier as "PREMIUM" | "STANDARD" | undefined,
        },
      );

      loadingToast.hide();

      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "IP Address Created",
          message: `Successfully created ${values.name}`,
        });

        onIPCreated();
        pop();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create IP Address",
          message: `Could not create IP address ${values.name}. Please check the logs for details.`,
        });
      }
    } catch (error) {
      console.error("Error creating IP address:", error);
      loadingToast.hide();
      showFailureToast(
        error instanceof NetworkServiceError
          ? error.message
          : `Failed to create IP address: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Create IP Address"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Ip Address" onSubmit={handleSubmit} icon={Icon.Network} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter IP address name" />

      <Form.TextField id="description" title="Description" placeholder="Enter optional description" />

      <Form.Dropdown
        id="addressType"
        title="Address Type"
        value={addressType}
        onChange={(value) => {
          setAddressType(value);

          if (value !== "INTERNAL") {
            setSelectedSubnet("");
          }
        }}
      >
        <Form.Dropdown.Item value="EXTERNAL" title="External" icon={Icon.Globe} />
        <Form.Dropdown.Item value="INTERNAL" title="Internal" icon={Icon.ComputerChip} />
      </Form.Dropdown>

      {addressType === "INTERNAL" && (
        <Form.Dropdown id="region" title="Region" placeholder="Select a region">
          {regions.map((region) => (
            <Form.Dropdown.Item key={region} value={region} title={region} />
          ))}
        </Form.Dropdown>
      )}

      {addressType === "INTERNAL" && (
        <Form.Dropdown id="subnet" title="Subnet" placeholder="Select a subnet" onChange={setSelectedSubnet}>
          {subnets.map((subnet) => (
            <Form.Dropdown.Item key={subnet.name} value={subnet.name} title={`${subnet.name} (${subnet.region})`} />
          ))}
        </Form.Dropdown>
      )}

      {addressType === "INTERNAL" && (
        <Form.Dropdown id="network" title="Network" placeholder="Select a network (optional)">
          {vpcs.map((vpc) => (
            <Form.Dropdown.Item key={vpc.name} value={vpc.name} title={vpc.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.TextField
        id="specificAddress"
        title="Specific IP Address"
        placeholder="Leave blank for auto-assignment"
        value={selectedIpAddress}
        onChange={setSelectedIpAddress}
        info={fetchingSuggestions ? "Loading suggestions..." : "Select a suggestion from the dropdown below"}
      />

      <Form.Description
        title="Available IP Suggestions"
        text={fetchingSuggestions ? "Loading suggestions..." : "Select a suggestion to use it"}
      />

      {ipSuggestions.length > 0 && !fetchingSuggestions && (
        <Form.Dropdown
          id="ipSuggestion"
          title="Suggested IPs"
          onChange={(value) => {
            setSelectedIpAddress(value);
          }}
        >
          {ipSuggestions.map((ip, index) => (
            <Form.Dropdown.Item key={`ip-${index}`} value={ip} title={ip} icon={Icon.Globe} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      {addressType === "INTERNAL" && (
        <Form.Dropdown id="purpose" title="Purpose" placeholder="Select a purpose (optional)">
          <Form.Dropdown.Item value="GCE_ENDPOINT" title="GCE Endpoint" />
          <Form.Dropdown.Item value="DNS_RESOLVER" title="DNS Resolver" />
          <Form.Dropdown.Item value="VPC_PEERING" title="VPC Peering" />
          <Form.Dropdown.Item value="IPSEC_INTERCONNECT" title="IPsec Interconnect" />
          <Form.Dropdown.Item value="PRIVATE_SERVICE_CONNECT" title="Private Service Connect" />
        </Form.Dropdown>
      )}

      <Form.Checkbox
        id="ephemeral"
        label="Ephemeral"
        title="Ephemeral IP"
        info="If checked, the IP address is ephemeral"
      />

      {addressType === "EXTERNAL" && (
        <Form.Dropdown id="networkTier" title="Network Tier" placeholder="Select a network tier (optional)">
          <Form.Dropdown.Item value="PREMIUM" title="Premium" />
          <Form.Dropdown.Item value="STANDARD" title="Standard" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
