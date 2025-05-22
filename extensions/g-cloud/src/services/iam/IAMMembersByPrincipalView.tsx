import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Form,
  Detail,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import { IAMService, IAMPrincipal } from "./IAMService";
import { formatRoleName } from "../../utils/iamRoles";
import { showFailureToast } from "@raycast/utils";
import { QuickProjectSwitcher } from "../../utils/QuickProjectSwitcher";

interface IAMMembersByPrincipalViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string;
  resourceType?: string;
}

export default function IAMMembersByPrincipalView({
  projectId,
  gcloudPath,
  resourceName,
  resourceType,
}: IAMMembersByPrincipalViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [principals, setPrincipals] = useState<IAMPrincipal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const iamService = useMemo(() => new IAMService(gcloudPath, projectId), [gcloudPath, projectId]);

  const fetchIAMPolicy = useCallback(
    async (shouldShowToast = false) => {
      setIsLoading(true);
      setError(null);

      let loadingToast: Toast | undefined;
      if (shouldShowToast) {
        loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Loading IAM policy...",
          message: resourceName || projectId,
        });
      }

      try {
        const principalsArray = await iamService.getIAMPrincipals(resourceType, resourceName);

        setPrincipals(principalsArray);

        const debugText = resourceName
          ? `Fetched IAM policy for ${resourceType}: ${resourceName}\n`
          : `Fetched project-level IAM policy for: ${projectId}\n`;

        setDebugInfo(debugText + `Found ${principalsArray.length} principals with IAM roles\n`);

        if (loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Success,
            title: "IAM policy loaded",
            message: `Found ${principalsArray.length} principals`,
          });
        }
      } catch (error: unknown) {
        console.error("Error fetching IAM policy:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        if (loadingToast) {
          loadingToast.hide();
          showFailureToast(error instanceof Error ? error.message : "Failed to fetch IAM policy");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [iamService, projectId, resourceName, resourceType],
  );

  useEffect(() => {
    fetchIAMPolicy(true);
  }, [fetchIAMPolicy]);

  function getMemberIcon(type: string) {
    switch (type) {
      case "user":
        return { source: Icon.Person, tintColor: Color.Blue };
      case "group":
        return { source: Icon.PersonCircle, tintColor: Color.Green };
      case "serviceAccount":
        return { source: Icon.Terminal, tintColor: Color.Orange };
      case "domain":
        return { source: Icon.Globe, tintColor: Color.Purple };
      case "allUsers":
        return { source: Icon.Globe, tintColor: Color.Red };
      case "allAuthenticatedUsers":
        return { source: Icon.Key, tintColor: Color.Yellow };
      case "projectEditor":
        return { source: Icon.Pencil, tintColor: Color.Blue };
      case "projectOwner":
        return { source: Icon.Star, tintColor: Color.Orange };
      case "projectViewer":
        return { source: Icon.Eye, tintColor: Color.Green };
      default:
        return { source: Icon.Person, tintColor: Color.PrimaryText };
    }
  }

  function getRoleIcon(role: string) {
    if (role.includes("admin") || role.includes("Admin")) {
      return { source: Icon.Star, tintColor: Color.Red };
    } else if (role.includes("owner") || role.includes("Owner")) {
      return { source: Icon.Key, tintColor: Color.Orange };
    } else if (role.includes("editor") || role.includes("Editor") || role.includes("write")) {
      return { source: Icon.Pencil, tintColor: Color.Blue };
    } else if (role.includes("viewer") || role.includes("Viewer") || role.includes("read")) {
      return { source: Icon.Eye, tintColor: Color.Green };
    } else {
      return { source: Icon.Circle, tintColor: Color.PrimaryText };
    }
  }

  async function addMember(values: { role: string; memberType: string; memberId: string }) {
    if (!values.role) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select a role",
      });
      return;
    }

    const addingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding member...",
      message: `${values.memberType}:${values.memberId} to ${values.role}`,
    });

    try {
      await iamService.addMember(values.role, values.memberType, values.memberId, resourceType, resourceName);

      addingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Member added",
        message: `${values.memberType}:${values.memberId} to ${values.role}`,
      });

      fetchIAMPolicy();
    } catch (error: unknown) {
      addingToast.hide();
      const errorMessage =
        error instanceof Error && error.message.includes("does not exist")
          ? `The user ${values.memberId} does not exist. Please check the email address and try again.`
          : error instanceof Error && (error.message.includes("Permission denied") || error.message.includes("403"))
            ? "You don't have permission to modify IAM policies for this resource."
            : error instanceof Error
              ? error.message
              : "Failed to add member";
      showFailureToast(errorMessage);
    }
  }

  async function removeMember(principal: IAMPrincipal, role: string) {
    const options = {
      title: "Remove Role",
      message: `Are you sure you want to remove role "${formatRoleName(role)}" from ${principal.type}:${principal.id}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const removingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing role...",
        message: `${role} from ${principal.type}:${principal.id}`,
      });

      try {
        await iamService.removeMember(role, principal.type, principal.id, resourceType, resourceName);

        removingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Role removed",
          message: `${role} removed from ${principal.type}:${principal.id}`,
        });

        fetchIAMPolicy();
      } catch (error: unknown) {
        removingToast.hide();
        showFailureToast(error instanceof Error ? error.message : "Failed to remove role");
      }
    }
  }

  function showAddMemberForm() {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Member" onSubmit={addMember} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="role" title="Role" defaultValue="roles/viewer">
          <Form.Dropdown.Item value="roles/owner" title="Owner" />
          <Form.Dropdown.Item value="roles/editor" title="Editor" />
          <Form.Dropdown.Item value="roles/viewer" title="Viewer" />
          <Form.Dropdown.Section title="Storage Roles">
            <Form.Dropdown.Item value="roles/storage.admin" title="Storage Admin" />
            <Form.Dropdown.Item value="roles/storage.objectAdmin" title="Storage Object Admin" />
            <Form.Dropdown.Item value="roles/storage.objectCreator" title="Storage Object Creator" />
            <Form.Dropdown.Item value="roles/storage.objectViewer" title="Storage Object Viewer" />
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Compute Roles">
            <Form.Dropdown.Item value="roles/compute.admin" title="Compute Admin" />
            <Form.Dropdown.Item value="roles/compute.instanceAdmin" title="Compute Instance Admin" />
            <Form.Dropdown.Item value="roles/compute.networkAdmin" title="Compute Network Admin" />
            <Form.Dropdown.Item value="roles/compute.viewer" title="Compute Viewer" />
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="IAM Roles">
            <Form.Dropdown.Item value="roles/iam.serviceAccountAdmin" title="Service Account Admin" />
            <Form.Dropdown.Item value="roles/iam.serviceAccountUser" title="Service Account User" />
            <Form.Dropdown.Item value="roles/iam.roleAdmin" title="Role Administrator" />
          </Form.Dropdown.Section>
        </Form.Dropdown>

        <Form.Dropdown id="memberType" title="Member Type" defaultValue="user">
          <Form.Dropdown.Item value="user" title="User" />
          <Form.Dropdown.Item value="group" title="Group" />
          <Form.Dropdown.Item value="serviceAccount" title="Service Account" />
          <Form.Dropdown.Item value="domain" title="Domain" />
          <Form.Dropdown.Item value="allUsers" title="All Users (Public)" />
          <Form.Dropdown.Item value="allAuthenticatedUsers" title="All Authenticated Users" />
        </Form.Dropdown>

        <Form.TextField id="memberId" title="Member ID" placeholder="user@example.com or domain.com" />
      </Form>,
    );
  }

  function showDebugInfo() {
    push(<Detail markdown={`# Debug Information\n\n${debugInfo}`} />);
  }

  function showPrincipalDetails(principal: IAMPrincipal) {
    let markdown = `# ${principal.displayName}: ${principal.id}\n\n`;

    markdown += `## Roles\n\n`;

    principal.roles.forEach((role) => {
      markdown += `### ${role.title}\n\n`;
      markdown += `**Role ID:** \`${role.role}\`\n\n`;

      if (role.description) {
        markdown += `**Description:** ${role.description}\n\n`;
      }

      if (role.condition) {
        markdown += `**Condition:** ${role.condition.title}\n\n`;
        markdown += `\`\`\`\n${role.condition.expression}\n\`\`\`\n\n`;

        if (role.condition.description) {
          markdown += `${role.condition.description}\n\n`;
        }
      }
    });

    push(
      <Detail
        navigationTitle={`${principal.displayName}: ${principal.id}`}
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={principal.displayName} />
            <Detail.Metadata.Label title="ID" text={principal.id} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Roles" text={`${principal.roles.length}`} />
            {principal.roles.map((role, index) => (
              <Detail.Metadata.Label
                key={`role-${index}`}
                title={role.title}
                text={role.role}
                icon={getRoleIcon(role.role)}
              />
            ))}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Add Role" icon={Icon.Plus} onAction={showAddMemberForm} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
            <ActionPanel.Submenu
              title="Remove Role"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            >
              {principal.roles.map((role) => (
                <Action
                  key={role.role}
                  title={role.title}
                  icon={getRoleIcon(role.role)}
                  style={Action.Style.Destructive}
                  onAction={() => removeMember(principal, role.role)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />,
    );
  }

  const services = useMemo(() => {
    const serviceSet = new Set<string>();

    principals.forEach((principal) => {
      principal.roles.forEach((role) => {
        const service = getRoleService(role.role);
        if (service) {
          serviceSet.add(service);
        }
      });
    });

    return Array.from(serviceSet).sort();
  }, [principals]);

  function getRoleService(role: string): string {
    if (role.startsWith("roles/storage.")) {
      return "Storage";
    } else if (role.startsWith("roles/compute.")) {
      return "Compute Engine";
    } else if (role.startsWith("roles/iam.")) {
      return "IAM";
    } else if (role.startsWith("roles/bigquery.")) {
      return "BigQuery";
    } else if (role.startsWith("roles/container.")) {
      return "Kubernetes Engine";
    } else if (role.startsWith("roles/cloudfunctions.")) {
      return "Cloud Functions";
    } else if (role.startsWith("roles/run.")) {
      return "Cloud Run";
    } else if (role === "roles/owner" || role === "roles/editor" || role === "roles/viewer") {
      return "Project";
    } else {
      return "Other";
    }
  }

  const filteredPrincipals = useMemo(() => {
    return principals.filter((principal) => {
      if (selectedType && principal.type !== selectedType) {
        return false;
      }

      if (selectedService) {
        const hasMatchingService = principal.roles.some((role) => getRoleService(role.role) === selectedService);

        if (!hasMatchingService) {
          return false;
        }
      }

      if (searchText) {
        const principalMatches =
          principal.id.toLowerCase().includes(searchText.toLowerCase()) ||
          principal.type.toLowerCase().includes(searchText.toLowerCase());

        const roleMatches = principal.roles.some(
          (role) =>
            role.role.toLowerCase().includes(searchText.toLowerCase()) ||
            role.title.toLowerCase().includes(searchText.toLowerCase()) ||
            (role.description && role.description.toLowerCase().includes(searchText.toLowerCase())),
        );

        return principalMatches || roleMatches;
      }

      return true;
    });
  }, [principals, selectedType, selectedService, searchText]);

  const principalTypes = useMemo(() => {
    return Array.from(new Set(principals.map((p) => p.type)));
  }, [principals]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchIAMPolicy} />
            <Action title="Show Debug Info" onAction={showDebugInfo} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search members or roles..."
      onSearchTextChange={setSearchText}
      navigationTitle={resourceName ? `IAM for ${resourceName}` : "IAM Members"}
      searchBarAccessory={
        <QuickProjectSwitcher
          gcloudPath={gcloudPath}
          onProjectSelect={(selectedProjectId) => {
            if (selectedProjectId !== projectId) {
              push(
                <IAMMembersByPrincipalView
                  projectId={selectedProjectId}
                  gcloudPath={gcloudPath}
                  resourceType={resourceType}
                  resourceName={resourceName}
                />,
              );
            }
          }}
        />
      }
      isShowingDetail
      actions={
        <ActionPanel>
          <Action title="Add Member" icon={Icon.Plus} onAction={showAddMemberForm} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={fetchIAMPolicy}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
          {selectedType && (
            <Action title="Clear Type Filter" icon={Icon.XmarkCircle} onAction={() => setSelectedType(null)} />
          )}
          {selectedService && (
            <Action title="Clear Service Filter" icon={Icon.XmarkCircle} onAction={() => setSelectedService(null)} />
          )}
        </ActionPanel>
      }
      filtering={false}
      throttle
    >
      <List.Section title="Filter by Service" subtitle={`${services.length} services`}>
        {services.map((service) => (
          <List.Item
            key={service}
            title={service}
            subtitle=""
            icon={
              service === "Storage"
                ? { source: Icon.HardDrive, tintColor: Color.Blue }
                : service === "Compute Engine"
                  ? { source: Icon.Desktop, tintColor: Color.Green }
                  : service === "IAM"
                    ? { source: Icon.Key, tintColor: Color.Yellow }
                    : service === "Project"
                      ? { source: Icon.Folder, tintColor: Color.Orange }
                      : { source: Icon.Circle, tintColor: Color.PrimaryText }
            }
            accessories={[
              {
                icon: selectedService === service ? Icon.Checkmark : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={selectedService === service ? "Clear Filter" : "Filter by This Service"}
                  icon={selectedService === service ? Icon.XmarkCircle : Icon.Filter}
                  onAction={() => setSelectedService(selectedService === service ? null : service)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {filteredPrincipals.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No IAM Members Found"
          description={searchText ? "Try a different search term" : "Add a member to get started"}
          icon={{ source: Icon.Person }}
          actions={
            <ActionPanel>
              <Action title="Add Member" icon={Icon.Plus} onAction={showAddMemberForm} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
              {(selectedType || selectedService || searchText) && (
                <Action
                  title="Clear All Filters"
                  icon={Icon.XmarkCircle}
                  onAction={() => {
                    setSelectedType(null);
                    setSelectedService(null);
                    setSearchText("");
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        principalTypes
          .filter((type) => !selectedType || type === selectedType)
          .map((type) => {
            const typePrincipals = filteredPrincipals.filter((p) => p.type === type);
            if (typePrincipals.length === 0) return null;

            return (
              <List.Section
                key={type}
                title={iamService.formatMemberType(type)}
                subtitle={`${typePrincipals.length} members`}
              >
                {typePrincipals.map((principal) => (
                  <List.Item
                    key={`${principal.type}-${principal.id}`}
                    title={principal.id || principal.type}
                    subtitle=""
                    icon={getMemberIcon(principal.type)}
                    accessories={[]}
                    detail={
                      <List.Item.Detail
                        markdown={`# ${principal.displayName}: ${principal.id}\n\n## Roles\n\n${principal.roles.map((role) => `- **${role.title}** (${role.role})`).join("\n\n")}`}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Type" text={principal.displayName} />
                            <List.Item.Detail.Metadata.Label title="ID" text={principal.id} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Roles" />
                            {principal.roles.map((role, index) => (
                              <List.Item.Detail.Metadata.Label
                                key={`role-${index}`}
                                title={role.title}
                                text={role.role}
                                icon={getRoleIcon(role.role)}
                              />
                            ))}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action title="View Details" icon={Icon.Eye} onAction={() => showPrincipalDetails(principal)} />
                        <Action title="Add Role" icon={Icon.Plus} onAction={showAddMemberForm} />
                        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
                        <ActionPanel.Submenu
                          title="Remove Role"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        >
                          {principal.roles.map((role) => (
                            <Action
                              key={role.role}
                              title={role.title}
                              icon={getRoleIcon(role.role)}
                              style={Action.Style.Destructive}
                              onAction={() => removeMember(principal, role.role)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          })
          .filter(Boolean)
      )}
    </List>
  );
}
