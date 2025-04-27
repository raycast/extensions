import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Action, List, Icon, Color, Toast, showToast, Form, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NetworkService, FirewallRule, VPC } from "./NetworkService";

interface FirewallRulesViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function FirewallRulesView({ projectId, gcloudPath }: FirewallRulesViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const [vpcs, setVPCs] = useState<VPC[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading firewall rules...",
        message: "Please wait while we fetch your firewall rules",
      });

      try {
        const fetchedRules = await networkService.getFirewallRules();
        setRules(fetchedRules);

        fetchVPCs(networkService);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "Firewall rules loaded",
          message: `${fetchedRules.length} firewall rules found`,
        });
      } catch (error) {
        console.error("Error initializing:", error);
        loadingToast.hide();
        showFailureToast(error instanceof Error ? error.message : "Failed to load firewall rules");
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);

  const fetchVPCs = async (networkService: NetworkService) => {
    try {
      const fetchedVPCs = await networkService.getVPCs();
      setVPCs(fetchedVPCs);

      if (fetchedVPCs.length === 0) {
        showToast({
          style: Toast.Style.Animated,
          title: "No VPC Networks Found",
          message: "You'll need at least one VPC network to create firewall rules",
        });
      }
    } catch (error) {
      console.error("Error fetching VPCs:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load VPC Networks",
        message: "This will affect your ability to create new firewall rules. Try refreshing.",
      });
    }
  };

  const refreshRules = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing firewall rules...",
    });

    try {
      const fetchedRules = await service.getFirewallRules();
      setRules(fetchedRules);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Firewall rules refreshed",
        message: `${fetchedRules.length} firewall rules found`,
      });
    } catch (error) {
      console.error("Error refreshing firewall rules:", error);
      loadingToast.hide();
      showFailureToast(error instanceof Error ? error.message : "Failed to refresh firewall rules");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const filteredRules = rules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(searchText.toLowerCase())),
  );

  const formatNetwork = (networkPath: string) => {
    if (!service) return networkPath;
    return service.formatNetwork(networkPath);
  };

  const formatDirection = (direction: string) => {
    return direction === "INGRESS" ? "Ingress (inbound)" : "Egress (outbound)";
  };

  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDirectionIcon = (direction: string) => {
    return {
      source: direction === "INGRESS" ? Icon.ArrowDown : Icon.ArrowUp,
      tintColor: direction === "INGRESS" ? Color.Green : Color.Orange,
    };
  };

  const getStatusIcon = (disabled: boolean) => {
    return {
      source: Icon.Circle,
      tintColor: disabled ? Color.Red : Color.Green,
    };
  };

  const handleCreateFirewallRule = useCallback(() => {
    if (!service) {
      showFailureToast("Network service is not initialized");
      return;
    }

    if (vpcs.length === 0) {
      showFailureToast("Please wait for VPC networks to be loaded");
      return;
    }

    push(<CreateFirewallRuleForm vpcs={vpcs} onRuleCreated={refreshRules} service={service} />);
  }, [gcloudPath, projectId, vpcs, refreshRules, push, service]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search firewall rules..."
      navigationTitle="Firewall Rules"
      filtering={false}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshRules}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Create Firewall Rule"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleCreateFirewallRule}
          />
        </ActionPanel>
      }
    >
      {filteredRules.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Firewall Rules Found"
          description={searchText ? "Try a different search term" : "Click the + button to create a new firewall rule"}
          icon={{ source: Icon.Shield }}
          actions={
            <ActionPanel>
              <Action title="Create Firewall Rule" icon={Icon.Plus} onAction={handleCreateFirewallRule} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshRules} />
            </ActionPanel>
          }
        />
      ) : (
        filteredRules.map((rule) => (
          <List.Item
            key={rule.id || rule.name}
            title={rule.name}
            subtitle={rule.description || ""}
            accessories={[
              {
                text: formatDirection(rule.direction),
                icon: getDirectionIcon(rule.direction),
                tooltip: "Direction",
              },
              {
                text: rule.disabled ? "Disabled" : "Enabled",
                icon: getStatusIcon(rule.disabled),
                tooltip: "Status",
              },
              {
                text: `Priority: ${rule.priority}`,
                tooltip: "Priority (lower number = higher priority)",
              },
            ]}
            icon={{ source: Icon.Shield }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Firewall Rule Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={rule.name} />
                    <List.Item.Detail.Metadata.Label title="Description" text={rule.description || "No description"} />
                    <List.Item.Detail.Metadata.Label title="Network" text={formatNetwork(rule.network)} />
                    <List.Item.Detail.Metadata.Label title="Priority" text={rule.priority.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={rule.disabled ? "Disabled" : "Enabled"}
                      icon={getStatusIcon(rule.disabled)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Traffic Configuration" />
                    <List.Item.Detail.Metadata.Label
                      title="Direction"
                      text={formatDirection(rule.direction)}
                      icon={getDirectionIcon(rule.direction)}
                    />

                    {rule.sourceRanges && rule.sourceRanges.length > 0 && (
                      <List.Item.Detail.Metadata.Label title="Source Ranges" text={rule.sourceRanges.join(", ")} />
                    )}

                    {rule.destinationRanges && rule.destinationRanges.length > 0 && (
                      <List.Item.Detail.Metadata.Label
                        title="Destination Ranges"
                        text={rule.destinationRanges.join(", ")}
                      />
                    )}

                    {rule.sourceTags && rule.sourceTags.length > 0 && (
                      <List.Item.Detail.Metadata.Label title="Source Tags" text={rule.sourceTags.join(", ")} />
                    )}

                    {rule.targetTags && rule.targetTags.length > 0 && (
                      <List.Item.Detail.Metadata.Label title="Target Tags" text={rule.targetTags.join(", ")} />
                    )}

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Traffic Rules" />

                    {rule.allowed &&
                      rule.allowed.length > 0 &&
                      rule.allowed.map((allowed, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={`allowed-${index}`}
                          title={`Allow ${index + 1}`}
                          text={
                            allowed.ports ? `${allowed.IPProtocol}:${allowed.ports.join(", ")}` : allowed.IPProtocol
                          }
                          icon={{ source: Icon.Check, tintColor: Color.Green }}
                        />
                      ))}

                    {rule.denied &&
                      rule.denied.length > 0 &&
                      rule.denied.map((denied, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={`denied-${index}`}
                          title={`Deny ${index + 1}`}
                          text={denied.ports ? `${denied.IPProtocol}:${denied.ports.join(", ")}` : denied.IPProtocol}
                          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
                        />
                      ))}

                    {rule.logConfig && (
                      <List.Item.Detail.Metadata.Label
                        title="Logging"
                        text={rule.logConfig.enable ? "Enabled" : "Disabled"}
                      />
                    )}

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={formatCreationTime(rule.creationTimestamp)}
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
                  onAction={refreshRules}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Create Firewall Rule"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={handleCreateFirewallRule}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface CreateFirewallRuleFormProps {
  vpcs: VPC[];
  onRuleCreated: () => void;
  service: NetworkService;
}

interface FirewallRuleFormValues {
  name: string;
  description: string;
  network: string;
  direction: string;
  ruleType: string;
  priority?: string;
  sourceRanges?: string;
  destinationRanges?: string;
  sourceTags?: string;
  targetTags?: string;
  protocol: string;
  ports?: string;
  disabled?: boolean;
  enableLogging?: boolean;
}

interface FirewallRuleOptions {
  description?: string;
  direction: "INGRESS" | "EGRESS";
  priority?: number;
  disabled?: boolean;
  enableLogging?: boolean;
  sourceRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  destinationRanges?: string[];
  allowed?: { protocol: string; ports?: string[] }[];
  denied?: { protocol: string; ports?: string[] }[];
}

function CreateFirewallRuleForm({ vpcs, onRuleCreated, service }: CreateFirewallRuleFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [direction, setDirection] = useState<string>("INGRESS");
  const [protocol, setProtocol] = useState<string>("tcp");

  async function handleSubmit(values: FirewallRuleFormValues) {
    if (!values.name) {
      showFailureToast("Please enter a rule name");
      return;
    }

    if (!values.network) {
      showFailureToast("Please select a network");
      return;
    }

    if (!values.protocol) {
      showFailureToast("Please select a protocol");
      return;
    }

    if (values.direction === "INGRESS" && !values.sourceRanges && !values.sourceTags) {
      showFailureToast("Please specify source ranges or source tags for ingress rules");
      return;
    }

    if (values.direction === "EGRESS" && !values.destinationRanges && !values.targetTags) {
      showFailureToast("Please specify destination ranges or target tags for egress rules");
      return;
    }

    setIsLoading(true);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating firewall rule...",
      message: `Creating ${values.name}`,
    });

    try {
      const ruleOptions: FirewallRuleOptions = {
        description: values.description,
        direction: values.direction as "INGRESS" | "EGRESS",
        priority: values.priority ? parseInt(values.priority) : undefined,
        disabled: values.disabled,
        enableLogging: values.enableLogging,
      };

      if (values.direction === "INGRESS") {
        if (values.sourceRanges) {
          ruleOptions.sourceRanges = values.sourceRanges.split(",").map((r) => r.trim());
        }
        if (values.sourceTags) {
          ruleOptions.sourceTags = values.sourceTags.split(",").map((t) => t.trim());
        }
        if (values.targetTags) {
          ruleOptions.targetTags = values.targetTags.split(",").map((t) => t.trim());
        }
      } else {
        if (values.destinationRanges) {
          ruleOptions.destinationRanges = values.destinationRanges.split(",").map((r) => r.trim());
        }
        if (values.targetTags) {
          ruleOptions.targetTags = values.targetTags.split(",").map((t) => t.trim());
        }
      }

      const protocolConfig = {
        protocol: values.protocol,
        ports: values.ports ? values.ports.split(",").map((p) => p.trim()) : undefined,
      };

      if (values.ruleType === "allow") {
        ruleOptions.allowed = [protocolConfig];
      } else {
        ruleOptions.denied = [protocolConfig];
      }

      const success = await service.createFirewallRule(values.name, values.network, ruleOptions);

      loadingToast.hide();

      if (success) {
        try {
          await onRuleCreated();
          showToast({
            style: Toast.Style.Success,
            title: "Firewall Rule Created",
            message: `Successfully created ${values.name}`,
          });
          pop();
        } catch (error) {
          console.error("Error refreshing rules:", error);
          showFailureToast("Rule was created but the list couldn't be refreshed. Please refresh manually.");
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Firewall Rule",
          message: "An error occurred while creating the firewall rule",
        });
      }
    } catch (error) {
      console.error("Error creating firewall rule:", error);
      loadingToast.hide();
      showFailureToast(error instanceof Error ? error.message : "Failed to create firewall rule");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Create Firewall Rule"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Firewall Rule" onSubmit={handleSubmit} icon={Icon.Shield} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Rule Name"
        placeholder="allow-http"
        info="The name of the new firewall rule"
        autoFocus
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Allow HTTP traffic"
        info="A human-readable description for this firewall rule"
      />
      <Form.Dropdown id="network" title="Network" info="The VPC network to which this rule applies">
        {vpcs.map((vpc) => (
          <Form.Dropdown.Item key={vpc.name} value={vpc.name} title={vpc.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="direction"
        title="Direction"
        defaultValue="INGRESS"
        info="Traffic direction that this rule applies to"
        onChange={setDirection}
      >
        <Form.Dropdown.Item
          value="INGRESS"
          title="Ingress (inbound)"
          icon={{ source: Icon.ArrowDown, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value="EGRESS"
          title="Egress (outbound)"
          icon={{ source: Icon.ArrowUp, tintColor: Color.Orange }}
        />
      </Form.Dropdown>

      <Form.Dropdown
        id="ruleType"
        title="Rule Type"
        defaultValue="allow"
        info="Whether to allow or deny matching traffic"
      >
        <Form.Dropdown.Item value="allow" title="Allow" icon={{ source: Icon.Check, tintColor: Color.Green }} />
        <Form.Dropdown.Item value="deny" title="Deny" icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }} />
      </Form.Dropdown>

      <Form.TextField
        id="priority"
        title="Priority"
        placeholder="1000"
        info="Lower values have higher precedence (default: 1000)"
      />

      {direction === "INGRESS" && (
        <Form.TextField
          id="sourceRanges"
          title="Source IP Ranges"
          placeholder="0.0.0.0/0,10.0.0.0/8"
          info="Comma-separated source IP ranges (CIDR notation)"
        />
      )}

      {direction === "EGRESS" && (
        <Form.TextField
          id="destinationRanges"
          title="Destination IP Ranges"
          placeholder="0.0.0.0/0,10.0.0.0/8"
          info="Comma-separated destination IP ranges (CIDR notation)"
        />
      )}

      {direction === "INGRESS" && (
        <Form.TextField
          id="sourceTags"
          title="Source Tags"
          placeholder="web-server,dev"
          info="Comma-separated source tags"
        />
      )}

      <Form.TextField
        id="targetTags"
        title="Target Tags"
        placeholder="web-server,dev"
        info="Comma-separated target tags"
      />

      <Form.Dropdown
        id="protocol"
        title="Protocol"
        defaultValue="tcp"
        value={protocol}
        onChange={setProtocol}
        info="The IP protocol this rule applies to"
      >
        <Form.Dropdown.Item value="tcp" title="TCP" />
        <Form.Dropdown.Item value="udp" title="UDP" />
        <Form.Dropdown.Item value="icmp" title="ICMP" />
        <Form.Dropdown.Item value="esp" title="ESP" />
        <Form.Dropdown.Item value="ah" title="AH" />
        <Form.Dropdown.Item value="sctp" title="SCTP" />
        <Form.Dropdown.Item value="all" title="All protocols" />
      </Form.Dropdown>

      <Form.TextField
        id="ports"
        title="Ports"
        placeholder="80,443"
        info={
          protocol === "all"
            ? "Ports cannot be specified when all protocols are selected"
            : "Comma-separated port numbers or ranges (e.g., 80-90)"
        }
        error={protocol === "all" ? "Ports are not applicable when all protocols are selected" : undefined}
      />

      <Form.Checkbox
        id="disabled"
        title="Disabled"
        label="Create rule in disabled state"
        info="When disabled, the rule won't be enforced"
      />

      <Form.Checkbox
        id="enableLogging"
        title="Enable Logging"
        label="Enable logging for this rule"
        info="Log matched traffic information"
      />
    </Form>
  );
}
