import { ActionPanel, Action, Detail, Icon, confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import { IAMPrincipal, IAMService } from "../IAMService";
import { formatRoleName } from "../../../utils/iamRoles";
import { showFailureToast } from "@raycast/utils";

interface IAMPrincipalDetailProps {
  principal: IAMPrincipal;
  iamService: IAMService;
  onRoleRemoved: () => void;
  onBack: () => void;
}

export default function IAMPrincipalDetail({ principal, iamService, onRoleRemoved, onBack }: IAMPrincipalDetailProps) {
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

  async function handleRemoveRole(role: string) {
    const confirmed = await confirmAlert({
      title: "Remove Role",
      message: `Are you sure you want to remove the role "${formatRoleName(role)}" from ${principal.id}?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
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
      } catch (error: unknown) {
        console.error("Error removing role:", error);
        showFailureToast({
          title: "Failed to Remove Role",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    }
  }

  const markdown = `
  # ${principal.displayName || principal.email || principal.id || "Unknown Principal"}
  
  **Type:** ${formatPrincipalType(principal.type)}
  
  **ID:** \`${principal.id || "N/A"}\`
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
      navigationTitle={`IAM Principal: ${principal.displayName || principal.email || principal.id || "Unknown Principal"}`}
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
                style={Action.Style.Destructive}
                onAction={() => handleRemoveRole(role.role)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
