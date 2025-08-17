import { ActionPanel, Action, Detail, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { Secret } from "../types";
import { apiClient } from "../lib/api-client";
import {
  formatDate,
  formatTime,
  truncateText,
  formatViewCount,
  getSecretDisplayTitle,
  shouldShowDescription,
  formatMaxViewsMetadata,
  formatUsageCount,
  formatExpiration,
} from "../lib/utils";
import { useRelatedRequests } from "../hooks/useRelatedData";
import { CreateActions } from "../lib/action-panels";
import { showFailureToast } from "@raycast/utils";

interface SecretDetailProps {
  secret: Secret;
  onDelete?: (id: string) => void;
}

export default function SecretDetail({ secret, onDelete }: SecretDetailProps) {
  const { pop, push } = useNavigation();
  const { relatedRequests, isLoading: isLoadingRequests } = useRelatedRequests(secret);

  const formatViewHistory = () => {
    if (!secret.views || secret.views.length === 0) {
      return "No views yet";
    }

    return secret.views
      .map((view, index) => {
        return `### ${index + 1}. Viewed on ${formatDate(view.viewed_at)}
- **Time:** ${formatTime(view.viewed_at)}
- **IP Address:** \`${view.viewed_by_ip}\`
- **User Agent:** \`${truncateText(view.viewed_by_user_agent, 80)}\`\n\n`;
      })
      .join("");
  };

  const handleDeleteSecret = async () => {
    if (!onDelete) return;

    try {
      await apiClient.deleteSecret(secret.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Secret Deleted",
        message: "Secret has been deleted successfully",
      });
      onDelete(secret.id);
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to delete secret" });
    }
  };

  const formatRelatedRequests = () => {
    if (isLoadingRequests) {
      return "\n\n## Related Request\n\nLoading...";
    }

    if (relatedRequests.length === 0) {
      return "\n\n## Related Request\n\nNo related request found.";
    }

    const request = relatedRequests[0]; // Only show the first match
    const usageText = formatUsageCount(request.limit);
    const expirationText = formatExpiration(request.expiration);

    return `\n\n## Related Request\n\n### ${request.description}
- **Usage:** ${usageText}
- **Expiration:** ${expirationText}
- **ID:** \`${request.id}\``;
  };

  const displayTitle = getSecretDisplayTitle(secret.message, secret.id);
  const shouldShowDesc = shouldShowDescription(secret.description, secret.message);
  const viewCountText = formatViewCount(secret.view_times, secret.max_views);
  const maxViewsText = formatMaxViewsMetadata(secret.max_views);

  return (
    <Detail
      markdown={`# ${displayTitle}

${shouldShowDesc ? `${secret.description}\n\n` : ""}

## History

${formatViewHistory()}${formatRelatedRequests()}

`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Views" text={viewCountText} />
          <Detail.Metadata.Label title="Created" text={formatDate(secret.created_at)} />
          {secret.expiration && <Detail.Metadata.Label title="Expires" text={`${secret.expiration} hours`} />}
          {maxViewsText && <Detail.Metadata.Label title="Max Views" text={maxViewsText} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Password Protected" text={secret.password ? "Yes" : "No"} />
          <Detail.Metadata.Label title="View Button" text={secret.view_button ? "Enabled" : "Disabled"} />
          <Detail.Metadata.Label title="CAPTCHA" text={secret.captcha ? "Enabled" : "Disabled"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {relatedRequests.length > 0 && (
              <Action
                title="View Secret Request"
                icon={Icon.Document}
                onAction={() => {
                  // Import dynamically to avoid circular dependency
                  import("../components/SecretRequestDetail").then(({ default: SecretRequestDetail }) => {
                    push(<SecretRequestDetail request={relatedRequests[0]} onDelete={() => {}} />);
                  });
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={pop} />
            {onDelete && (
              <Action
                title="Delete Secret"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDeleteSecret}
              />
            )}
          </ActionPanel.Section>
          <CreateActions push={push} />
        </ActionPanel>
      }
    />
  );
}
