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
import { useState, useEffect } from "react";
import { executeGcloudCommand } from "../../gcloud";
import { getRoleInfo, formatRoleName } from "../../utils/iamRoles";
import { showFailureToast } from "@raycast/utils";

interface IAMMembersViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string;
  resourceType?: string;
}

interface IAMRole {
  role: string;
  title: string;
  description?: string;
  members: IAMMember[];
}

interface IAMMember {
  type: string;
  id: string;
  email?: string;
  displayName?: string;
}

export default function IAMMembersView({ projectId, gcloudPath, resourceName, resourceType }: IAMMembersViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<IAMRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    fetchIAMPolicy();
  }, []);

  async function fetchIAMPolicy() {
    setIsLoading(true);
    setError(null);

    let command = "";
    let debugText = "";

    if (resourceType === "storage" && resourceName) {
      command = `storage buckets get-iam-policy gs://${resourceName} --format=json`;
      debugText = `Fetching IAM policy for bucket: ${resourceName}\n`;
    } else {
      command = `projects get-iam-policy ${projectId}`;
      debugText = `Fetching project-level IAM policy for: ${projectId}\n`;
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Loading IAM policy...",
      message: resourceName || projectId,
    });

    try {
      const result = await executeGcloudCommand(gcloudPath, command);

      if (!Array.isArray(result) || result.length === 0) {
        setError("No IAM policy found or empty result");
        setIsLoading(false);
        showFailureToast("No IAM policy found");
        return;
      }

      const policy = Array.isArray(result) ? result[0] : result;

      if (!policy.bindings || !Array.isArray(policy.bindings)) {
        setError("Invalid IAM policy format: no bindings found");
        setIsLoading(false);
        showFailureToast({
          title: "Invalid IAM policy format",
          message: "No bindings found",
        });
        return;
      }

      const processedRoles: IAMRole[] = policy.bindings.map((binding: { role: string; members: string[] }) => {
        const roleInfo = getRoleInfo(binding.role);

        const members = binding.members.map((member: string) => {
          const [type, id] = member.split(":");
          return {
            type,
            id,
            email: id,
            displayName: formatMemberType(type),
          };
        });

        return {
          role: binding.role,
          title: roleInfo.title || formatRoleName(binding.role),
          description: roleInfo.description,
          members,
        };
      });

      setRoles(processedRoles);
      debugText += `Found ${processedRoles.length} roles with members\n`;

      showToast({
        style: Toast.Style.Success,
        title: "IAM policy loaded",
        message: `Found ${processedRoles.length} roles`,
      });
    } catch (error: unknown) {
      console.error("Error fetching IAM policy:", error);
      setError(`Failed to fetch IAM policy: ${error instanceof Error ? error.message : String(error)}`);
      showFailureToast(error);
    } finally {
      setDebugInfo(debugText);
      setIsLoading(false);
    }
  }

  function formatMemberType(type: string) {
    switch (type) {
      case "user":
        return "User";
      case "group":
        return "Group";
      case "serviceAccount":
        return "Service Account";
      case "domain":
        return "Domain";
      case "allUsers":
        return "All Users (Public)";
      case "allAuthenticatedUsers":
        return "All Authenticated Users";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

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
    const addingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding member...",
      message: `${values.memberType}:${values.memberId} to ${values.role}`,
    });

    try {
      if (!validateMemberId(values.memberType, values.memberId)) {
        addingToast.hide();
        showFailureToast({
          title: "Invalid member ID format",
          message: `The format for ${values.memberType} is incorrect. Please check and try again.`,
        });
        return;
      }

      let command = "";

      if (resourceType === "storage" && resourceName) {
        command = `storage buckets add-iam-policy-binding gs://${resourceName} --member=${values.memberType}:${values.memberId} --role=${values.role}`;
      } else {
        command = `projects add-iam-policy-binding ${projectId} --member=${values.memberType}:${values.memberId} --role=${values.role}`;
      }

      await executeGcloudCommand(gcloudPath, command);

      addingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Member added",
        message: `${values.memberType}:${values.memberId} to ${values.role}`,
      });

      fetchIAMPolicy();
    } catch (error: unknown) {
      addingToast.hide();

      if (error instanceof Error) {
        const message = error.message;
        if (message.includes("does not exist")) {
          showFailureToast({
            title: "User not found",
            message: `The user ${values.memberId} does not exist. Please check the email address and try again.`,
          });
        } else if (message.includes("Permission denied") || message.includes("403")) {
          showFailureToast({
            title: "Permission denied",
            message: "You don't have permission to modify IAM policies for this resource.",
          });
        } else {
          showFailureToast(error);
        }
      } else {
        showFailureToast("Failed to add member");
      }
    }
  }

  function validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case "user":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "serviceAccount":
        return (
          /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)
        );
      case "group":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "domain":
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      case "allUsers":
      case "allAuthenticatedUsers":
        return true;
      default:
        return id.trim() !== "";
    }
  }

  async function removeMember(role: string, memberType: string, memberId: string) {
    const options = {
      title: "Remove Member",
      message: `Are you sure you want to remove ${memberType}:${memberId} from ${formatRoleName(role)}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const removingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing member...",
        message: `${memberType}:${memberId} from ${role}`,
      });

      try {
        let command = "";

        if (resourceType === "storage" && resourceName) {
          command = `storage buckets remove-iam-policy-binding gs://${resourceName} --member=${memberType}:${memberId} --role=${role}`;
        } else {
          command = `projects remove-iam-policy-binding ${projectId} --member=${memberType}:${memberId} --role=${role}`;
        }

        await executeGcloudCommand(gcloudPath, command);

        removingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Member removed",
          message: `${memberType}:${memberId} from ${role}`,
        });

        fetchIAMPolicy();
      } catch (error: unknown) {
        removingToast.hide();
        showFailureToast(error);
      }
    }
  }

  function showAddMemberForm() {
    const defaultRole = roles.length > 0 ? roles[0].role : "roles/storage.objectViewer";

    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Member" onSubmit={addMember} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="role" title="Role" defaultValue={defaultRole}>
          {roles.map((role) => (
            <Form.Dropdown.Item key={role.role} value={role.role} title={role.title} />
          ))}
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

  const filteredRoles = roles.filter((role) => {
    if (selectedRole && role.role !== selectedRole) {
      return false;
    }

    if (searchText) {
      const roleMatches =
        role.role.toLowerCase().includes(searchText.toLowerCase()) ||
        role.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchText.toLowerCase()));

      const memberMatches = role.members.some(
        (member) =>
          member.id.toLowerCase().includes(searchText.toLowerCase()) ||
          member.type.toLowerCase().includes(searchText.toLowerCase()),
      );

      return roleMatches || memberMatches;
    }

    return true;
  });

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchIAMPolicy} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search roles or members..."
      onSearchTextChange={setSearchText}
      navigationTitle={resourceName ? `IAM for ${resourceName}` : "IAM Members"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Role" value={selectedRole || ""} onChange={setSelectedRole}>
          <List.Dropdown.Item title="All Roles" value="" />
          {roles.map((role) => (
            <List.Dropdown.Item key={role.role} title={role.title} value={role.role} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Add Member" icon={Icon.Plus} onAction={showAddMemberForm} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
          {selectedRole && (
            <Action title="Clear Role Filter" icon={Icon.XmarkCircle} onAction={() => setSelectedRole(null)} />
          )}
        </ActionPanel>
      }
    >
      {filteredRoles.map((role) => (
        <List.Section key={role.role} title={role.title} subtitle={`${role.members.length} members`}>
          {role.members.map((member, index) => (
            <List.Item
              key={`${role.role}-${member.type}-${member.id}-${index}`}
              title={member.id}
              subtitle={member.displayName}
              icon={getMemberIcon(member.type)}
              accessories={[
                {
                  icon: getRoleIcon(role.role),
                  tooltip: role.title,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove Member"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => removeMember(role.role, member.type, member.id)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {filteredRoles.length === 0 && (
        <List.EmptyView
          title="No IAM Roles or Members Found"
          description={searchText ? "Try a different search term" : "Add a member to get started"}
          icon={{ source: Icon.Person }}
        />
      )}
    </List>
  );
}
