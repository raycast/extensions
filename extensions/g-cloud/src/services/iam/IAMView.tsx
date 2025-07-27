import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Detail,
  Color,
  confirmAlert,
  Form,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { IAMService, IAMPrincipal, IAMRole } from "./IAMService";
import { showFailureToast } from "@raycast/utils";
import { predefinedRoles } from "../../utils/iamRoles";
import { QuickProjectSwitcher } from "../../utils/QuickProjectSwitcher";

interface IAMViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string;
  resourceType?: string;
}

export default function IAMView({ projectId, gcloudPath, resourceName, resourceType }: IAMViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [principals, setPrincipals] = useState<IAMPrincipal[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  const iamService = useMemo(() => new IAMService(gcloudPath, projectId), [gcloudPath, projectId]);

  const rolesByService = useMemo(() => {
    const services: Record<string, { title: string; roles: { value: string; title: string }[] }> = {};

    Object.entries(predefinedRoles).forEach(([role, info]) => {
      if (!services[info.service]) {
        services[info.service] = {
          title: info.service,
          roles: [],
        };
      }

      services[info.service].roles.push({
        value: role,
        title: info.title,
      });
    });

    Object.values(services).forEach((service) => {
      service.roles.sort((a, b) => a.title.localeCompare(b.title));
    });

    return Object.entries(services)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, service]) => service);
  }, []);

  const getRoleService = (role: string): string => {
    if (role.startsWith("roles/")) {
      const parts = role.split("/")[1].split(".");
      if (parts.length > 1) {
        return parts[0];
      } else {
        return "project";
      }
    }
    return "custom";
  };

  useEffect(() => {
    fetchIAMPolicy();
  }, [iamService]);

  async function fetchIAMPolicy() {
    setIsLoading(true);

    let loadingToast;
    if (principals.length === 0) {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IAM policy...",
        message: resourceName ? `For ${resourceType}: ${resourceName}` : `For project: ${projectId}`,
      });
    }

    try {
      const fetchedPrincipals = await iamService.getIAMPrincipals(resourceType, resourceName);
      setPrincipals(fetchedPrincipals);
      setError(null);

      if (loadingToast) {
        loadingToast.hide();
      }
    } catch (error) {
      console.error("Error fetching IAM policy:", error);
      setError("Failed to fetch IAM policy");

      if (loadingToast) {
        loadingToast.hide();
      }

      showFailureToast(error);
    } finally {
      setIsLoading(false);
    }
  }

  const principalTypes = useMemo(() => {
    const types = new Set<string>();
    principals.forEach((p) => types.add(p.type));
    return Array.from(types);
  }, [principals]);

  const filteredPrincipals = useMemo(() => {
    return principals.filter((principal) => {
      if (
        searchText &&
        !principal.id.toLowerCase().includes(searchText.toLowerCase()) &&
        !principal.roles.some(
          (role) =>
            role.role.toLowerCase().includes(searchText.toLowerCase()) ||
            role.title.toLowerCase().includes(searchText.toLowerCase()),
        )
      ) {
        return false;
      }

      if (selectedType && principal.type !== selectedType) {
        return false;
      }

      if (selectedService) {
        return principal.roles.some((role) => getRoleService(role.role) === selectedService.toLowerCase());
      }

      return true;
    });
  }, [principals, searchText, selectedType, selectedService]);

  const principalsByType = useMemo(() => {
    const byType: Record<string, IAMPrincipal[]> = {};

    principals.forEach((principal) => {
      if (!byType[principal.type]) {
        byType[principal.type] = [];
      }

      byType[principal.type].push(principal);
    });

    Object.values(byType).forEach((typePrincipals) => {
      typePrincipals.sort((a, b) => a.id.localeCompare(b.id));
    });

    return byType;
  }, [principals]);

  async function showAddMemberForm() {
    push(
      <Form
        navigationTitle="Add IAM Member"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Member"
              onSubmit={async (values) => {
                setIsLoading(true);

                const loadingToast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Adding member...",
                  message: `Adding member to ${values.role}`,
                });

                try {
                  let memberId = "";

                  if (values.existingMemberId && values.existingMemberId !== "none") {
                    memberId = values.existingMemberId;
                  } else if (values.newMemberId) {
                    memberId = values.newMemberId;
                  }

                  if (!memberId) {
                    loadingToast.hide();
                    throw new Error("Member ID is required");
                  }

                  await iamService.addMember(values.role, values.memberType, memberId, resourceType, resourceName);

                  loadingToast.hide();

                  showToast({
                    style: Toast.Style.Success,
                    title: "Member added",
                    message: `${memberId} added to ${values.role}`,
                  });

                  pop();
                  fetchIAMPolicy();
                } catch (error) {
                  console.error("Error adding member:", error);
                  loadingToast.hide();
                  showFailureToast(error);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
            <Action title="Create New Group" icon={Icon.PersonCircle} onAction={showCreateGroupForm} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="memberType" title="Member Type" defaultValue="user">
          <Form.Dropdown.Item value="user" title="User" icon={Icon.Person} />
          <Form.Dropdown.Item value="serviceAccount" title="Service Account" icon={Icon.Terminal} />
          <Form.Dropdown.Item value="group" title="Group" icon={Icon.PersonCircle} />
          <Form.Dropdown.Item value="domain" title="Domain" icon={Icon.Globe} />
        </Form.Dropdown>

        <Form.Separator />

        <Form.Description
          title="Member Selection"
          text="You can either select an existing member from the dropdown or enter a new member ID below"
        />

        <Form.Dropdown
          id="existingMemberId"
          title="Existing Member"
          info="Select an existing member or choose 'Enter New Member' to type a custom ID"
          defaultValue="none"
        >
          <Form.Dropdown.Item value="none" title="Enter New Member" icon={Icon.Plus} />

          {Object.entries(principalsByType).map(([type, principals]) => (
            <Form.Dropdown.Section key={type} title={iamService.formatMemberType(type)}>
              {principals.map((principal) => (
                <Form.Dropdown.Item
                  key={principal.id}
                  value={principal.id}
                  title={principal.id}
                  icon={getMemberIcon(principal.type)}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>

        <Form.TextField
          id="newMemberId"
          title="New Member ID"
          placeholder="user:user@example.com, serviceAccount:sa@project.iam.gserviceaccount.com"
          info="Email address for users and service accounts, domain name for domains"
          autoFocus
          storeValue
        />

        <Form.Separator />

        <Form.Dropdown id="role" title="Role" storeValue>
          {rolesByService.map((service) => (
            <Form.Dropdown.Section key={service.title} title={service.title}>
              {service.roles.map((role) => (
                <Form.Dropdown.Item
                  key={role.value}
                  value={role.value}
                  title={role.title}
                  icon={getRoleIcon(role.value)}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      </Form>,
    );
  }

  async function showCreateGroupForm() {
    push(
      <Form
        navigationTitle="Create IAM Group"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Group"
              onSubmit={async (values) => {
                setIsLoading(true);

                const loadingToast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Creating group...",
                  message: `Creating group ${values.groupId}`,
                });

                try {
                  await iamService.createGroup(values.groupId, values.displayName, values.description);

                  loadingToast.hide();

                  showToast({
                    style: Toast.Style.Success,
                    title: "Group created",
                    message: `Group ${values.groupId} created successfully`,
                  });

                  pop();
                  fetchIAMPolicy();
                } catch (error) {
                  console.error("Error creating group:", error);
                  loadingToast.hide();
                  showFailureToast(error);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="groupId"
          title="Group ID"
          placeholder="my-group@example.com"
          info="Email address for the group"
          autoFocus
          storeValue
        />

        <Form.TextField
          id="displayName"
          title="Display Name"
          placeholder="My Group"
          info="Human-readable name for the group"
          storeValue
        />

        <Form.TextArea
          id="description"
          title="Description"
          placeholder="Description of the group's purpose"
          info="Optional description for the group"
        />
      </Form>,
    );
  }

  async function removeMember(principal: IAMPrincipal, role: IAMRole) {
    const confirmed = await confirmAlert({
      title: "Remove Member",
      message: `Are you sure you want to remove ${principal.id} from role ${role.title}?`,
      primaryAction: {
        title: "Remove",
      },
    });

    if (confirmed) {
      setIsLoading(true);

      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing member...",
        message: `Removing ${principal.id} from ${role.title}`,
      });

      try {
        await iamService.removeMember(role.role, principal.type, principal.id, resourceType, resourceName);

        loadingToast.hide();

        showToast({
          style: Toast.Style.Success,
          title: "Member removed",
          message: `${principal.id} removed from ${role.title}`,
        });

        fetchIAMPolicy();
      } catch (error) {
        console.error("Error removing member:", error);
        loadingToast.hide();
        showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  function getMemberIcon(type: string): string {
    switch (type) {
      case "user":
        return Icon.Person;
      case "serviceAccount":
        return Icon.Terminal;
      case "group":
        return Icon.PersonCircle;
      case "domain":
        return Icon.Globe;
      default:
        return Icon.Key;
    }
  }

  function getRoleIcon(role: string): { source: string; tintColor: Color } {
    if (role.includes("admin")) {
      return { source: Icon.Shield, tintColor: Color.Red };
    } else if (role.includes("editor") || role.includes("write")) {
      return { source: Icon.Pencil, tintColor: Color.Orange };
    } else if (role.includes("viewer") || role.includes("read")) {
      return { source: Icon.Eye, tintColor: Color.Blue };
    } else if (role.includes("owner")) {
      return { source: Icon.Person, tintColor: Color.Purple };
    } else if (role.includes("storage")) {
      return { source: Icon.Box, tintColor: Color.Green };
    } else if (role.includes("compute")) {
      return { source: Icon.Terminal, tintColor: Color.Magenta };
    } else if (role.includes("iam")) {
      return { source: Icon.Key, tintColor: Color.Yellow };
    } else {
      return { source: Icon.Key, tintColor: Color.PrimaryText };
    }
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
            <Action title="Add Role" icon={Icon.Plus} onAction={() => showAddRoleForm(principal)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
          </ActionPanel>
        }
      />,
    );
  }

  async function showAddRoleForm(principal: IAMPrincipal) {
    push(
      <Form
        navigationTitle={`Add Role to ${principal.id}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Role"
              onSubmit={async (values) => {
                setIsLoading(true);

                const loadingToast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Adding role...",
                  message: `Please wait while the role is being added`,
                });

                try {
                  let memberId = "";

                  if (values.existingMemberId && values.existingMemberId !== "none") {
                    memberId = values.existingMemberId;
                  } else if (values.newMemberId) {
                    memberId = values.newMemberId;
                  } else {
                    memberId = principal.id;
                  }

                  if (!memberId) {
                    loadingToast.hide();
                    throw new Error("Member ID is required");
                  }

                  let memberType = principal.type;
                  if (memberId !== principal.id) {
                    const parts = memberId.split(":");
                    if (parts.length === 2) {
                      memberType = parts[0];
                      memberId = parts[1];
                    }
                  }

                  await iamService.addMember(values.role, memberType, memberId, resourceType, resourceName);

                  loadingToast.hide();

                  showToast({
                    style: Toast.Style.Success,
                    title: "Role added",
                    message: `${values.role} added to ${memberId}`,
                  });

                  pop();
                  fetchIAMPolicy();
                } catch (error) {
                  console.error("Error adding role:", error);
                  loadingToast.hide();
                  showFailureToast(error);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description title={`Adding role to ${principal.displayName}`} text={`Default User ID: ${principal.id}`} />

        <Form.Separator />

        <Form.Description
          title="Member Selection"
          text="You can either select an existing member from the dropdown, enter a new member ID below, or use the default member above"
        />

        <Form.Dropdown
          id="existingMemberId"
          title="Existing Member"
          info="Select an existing member or choose 'Enter New Member' to type a custom ID"
          defaultValue="none"
        >
          <Form.Dropdown.Item value="none" title="Use Default or Enter New Member" icon={Icon.Plus} />

          {Object.entries(principalsByType).map(([type, principals]) => (
            <Form.Dropdown.Section key={type} title={iamService.formatMemberType(type)}>
              {principals.map((p) => (
                <Form.Dropdown.Item key={p.id} value={p.id} title={p.id} icon={getMemberIcon(p.type)} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>

        <Form.TextField
          id="newMemberId"
          title="New Member ID"
          placeholder="user:user@example.com, serviceAccount:sa@project.iam.gserviceaccount.com"
          info="Email address for users and service accounts, domain name for domains"
          storeValue
        />

        <Form.Separator />

        <Form.Dropdown id="role" title="Role" storeValue>
          {rolesByService.map((service) => (
            <Form.Dropdown.Section key={service.title} title={service.title}>
              {service.roles.map((role) => (
                <Form.Dropdown.Item
                  key={role.value}
                  value={role.value}
                  title={role.title}
                  icon={getRoleIcon(role.value)}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      </Form>,
    );
  }

  function showDebugInfo() {
    const debugInfo = `
# IAM Debug Information

## Project
- Project ID: ${projectId}
- gcloud Path: ${gcloudPath}

## Resource
${resourceType ? `- Resource Type: ${resourceType}` : "- No specific resource type"}
${resourceName ? `- Resource Name: ${resourceName}` : "- No specific resource name"}

## Filters
- Search Text: ${searchText || "None"}
- Selected Type: ${selectedType || "None"}
- Selected Service: ${selectedService || "None"}

## Data
- Total Principals: ${principals.length}
- Filtered Principals: ${filteredPrincipals.length}
- Principal Types: ${principalTypes.join(", ")}
    `;

    push(<Detail navigationTitle="IAM Debug Information" markdown={debugInfo} />);
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading IAM Data"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search members or roles..."
      onSearchTextChange={setSearchText}
      navigationTitle={resourceName ? `IAM for ${resourceName}` : `IAM - ${projectId}`}
      searchBarAccessory={
        <QuickProjectSwitcher
          gcloudPath={gcloudPath}
          onProjectSelect={(selectedProjectId) => {
            if (selectedProjectId !== projectId) {
              push(
                <IAMView
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
          <Action title="Create Group" icon={Icon.PersonCircle} onAction={showCreateGroupForm} />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
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
      {filteredPrincipals.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No IAM Members Found"
          description={searchText ? "Try a different search term" : "Add a member to get started"}
          icon={{ source: Icon.Person }}
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
                    icon={getMemberIcon(principal.type)}
                    detail={
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Type" text={principal.displayName} />
                            <List.Item.Detail.Metadata.Label title="ID" text={principal.id} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Roles" text={`${principal.roles.length}`} />
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
                        <Action title="Add Role" icon={Icon.Plus} onAction={() => showAddRoleForm(principal)} />
                        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
                        {principal.roles.map((role) => (
                          <Action
                            key={`remove-${role.role}`}
                            title={`Remove from ${role.title}`}
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => removeMember(principal, role)}
                          />
                        ))}
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          })
      )}
    </List>
  );
}
