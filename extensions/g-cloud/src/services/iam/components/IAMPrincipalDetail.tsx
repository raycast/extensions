import { ActionPanel, Action, Detail, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { IAMPrincipal, IAMService } from "../IAMService";
import { formatRoleName } from "../../../utils/iamRoles";

interface IAMPrincipalDetailProps {
  principal: IAMPrincipal;
  iamService: IAMService;
  onRoleRemoved: () => void;
  onBack: () => void;
}

export default function IAMPrincipalDetail({ principal, iamService, onRoleRemoved, onBack }: IAMPrincipalDetailProps) {
  // Format the principal type for display
  function formatPrincipalType(type: string): string {
    switch (type) {
      case "user":
        return "User";
      case "serviceAccount":
        return "Service Account";
      case "group":
        return "Group";
      case "domain":
        return "Domain";
      default:
        return type;
    }
  }

  // Get icon for principal type
  function getPrincipalIcon(type: string): string {
    switch (type) {
      case "user":
        return "👤";
      case "serviceAccount":
        return "🤖";
      case "group":
        return "👥";
      case "domain":
        return "🌐";
      default:
        return "👤";
    }
  }

  // Handle role removal
  async function handleRemoveRole(role: string) {
    const confirmed = await confirmAlert({
      title: "Remove Role",
      message: `Are you sure you want to remove the role "${formatRoleName(role)}" from ${principal.id}?`,
      primaryAction: {
        title: "Remove",
      },
    });

    if (confirmed) {
      try {
        await iamService.removeMember(role, principal.type, principal.id);

        showToast({
          style: Toast.Style.Success,
          title: "Role removed",
          message: `Removed ${formatRoleName(role)} from ${principal.id}`,
        });

        onRoleRemoved();
      } catch (error) {
        console.error("Error removing role:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove role",
          message: String(error),
        });
      }
    }
  }

  // Generate markdown content for the detail view
  const markdown = `
  # ${principal.displayName || principal.email || principal.id}
  
  ${getPrincipalIcon(principal.type)} **${formatPrincipalType(principal.type)}**
  
  **ID:** \`${principal.id}\`
  ${principal.email ? `**Email:** ${principal.email}` : ""}
  
  ## Roles (${principal.roles.length})
  
  ${principal.roles
    .map(
      (role) => `
  ### ${formatRoleName(role.role)}
  
  ${role.title}
  
  ${role.description ? `> ${role.description}` : ""}
  
  ${
    role.condition
      ? `**Condition:** ${role.condition.title}
  \`\`\`
  ${role.condition.expression}
  \`\`\`
  `
      : ""
  }
  `,
    )
    .join("\n")}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`IAM Principal: ${principal.displayName || principal.email || principal.id}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Roles">
            {principal.roles.map((role) => (
              <Action
                key={role.role}
                title={`Remove ${formatRoleName(role.role)}`}
                icon={Icon.Trash}
                onAction={() => handleRemoveRole(role.role)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
