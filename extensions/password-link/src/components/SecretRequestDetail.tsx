import { ActionPanel, Action, Detail, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { SecretRequest } from "../types";
import { apiClient } from "../lib/api-client";
import {
  generateSecretRequestUrl,
  getRequestDisplayTitle,
  shouldShowDescription,
  formatExpiration,
  formatDate,
  formatTime,
} from "../lib/utils";
import { useRelatedSecrets } from "../hooks/useRelatedData";
import { openUrl } from "../lib/action-utils";
import { CreateActions } from "../lib/action-panels";
import { showFailureToast } from "@raycast/utils";

interface SecretRequestDetailProps {
  request: SecretRequest;
  onDelete: (id: string) => void;
}

export default function SecretRequestDetail({ request, onDelete }: SecretRequestDetailProps) {
  const { pop, push } = useNavigation();
  const { relatedSecrets, isLoading: isLoadingSecrets } = useRelatedSecrets(request);
  const requestUrl = generateSecretRequestUrl(request.id);

  const handleDeleteRequest = async () => {
    try {
      await apiClient.deleteSecretRequest(request.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Request Deleted",
        message: "Secret request has been deleted successfully",
      });
      onDelete(request.id);
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete secret request" });
    }
  };

  const displayTitle = getRequestDisplayTitle(request.message, request.id);
  const shouldShowDesc = shouldShowDescription(request.description, request.message);
  const expirationText = formatExpiration(request.expiration);

  const getExpirationSummary = () => {
    if (!request.expiration || request.expiration === 0) {
      return "never expires";
    }
    return `expires in ${request.expiration} hours`;
  };

  const getUsageText = () => {
    return request.limit === 1 ? "once" : `${request.limit} times`;
  };

  const formatRelatedSecrets = () => {
    if (isLoadingSecrets) {
      return "\n\n## Related Secret\n\nLoading...";
    }

    if (relatedSecrets.length === 0) {
      return "\n\n## Related Secret\n\nNo related secret found.";
    }

    const secret = relatedSecrets[0]; // Only show the first match
    const viewCountText =
      secret.view_times > 0
        ? secret.max_views
          ? `Viewed (${secret.view_times}/${secret.max_views})`
          : "Viewed"
        : "Not viewed";

    return `\n\n## Related Secret\n\n### ${secret.message || secret.id}
- **Created:** ${formatDate(secret.created_at)} ${formatTime(secret.created_at)}
- **Views:** ${viewCountText}
- **ID:** \`${secret.id}\``;
  };

  const handleOpenRelatedSecret = () => {
    if (relatedSecrets.length > 0) {
      const secret = relatedSecrets[0];
      // Import dynamically to avoid circular dependency
      import("./SecretDetail").then(({ default: SecretDetail }) => {
        push(<SecretDetail secret={secret} />);
      });
    }
  };

  return (
    <Detail
      markdown={`# ${displayTitle}

${shouldShowDesc ? `${request.description}\n\n` : ""}

## Usage

Can be used ${getUsageText()} and ${getExpirationSummary()}.

${request.send_to_email ? `**Note:** Created secrets will be automatically sent to ${request.send_to_email}` : ""}${formatRelatedSecrets()}

`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Usage" text={String(request.limit)} />
          <Detail.Metadata.Label title="Expiration" text={expirationText} />
          {request.send_to_email && <Detail.Metadata.Label title="Send to Email" text={request.send_to_email} />}
          <Detail.Metadata.Separator />
          {request.secret_description && request.secret_description !== request.secret_message && (
            <Detail.Metadata.Label title="Secret Description" text={request.secret_description} />
          )}
          <Detail.Metadata.Label title="Secret Message" text={request.secret_message || "None"} />
          <Detail.Metadata.Label
            title="Secret Expiration"
            text={request.secret_expiration ? formatExpiration(request.secret_expiration) : "No expiration"}
          />
          <Detail.Metadata.Label
            title="Secret Max Views"
            text={request.secret_max_views ? request.secret_max_views.toString() : "Unlimited"}
          />
          <Detail.Metadata.Label title="Password Protected" text={request.secret_password ? "Yes" : "No"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in Web" icon={Icon.Globe} onAction={() => openUrl(requestUrl)} />
            {relatedSecrets.length > 0 && (
              <Action title="View Secret" icon={Icon.Fingerprint} onAction={handleOpenRelatedSecret} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={pop} />
            <Action
              title="Delete Request"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDeleteRequest}
            />
          </ActionPanel.Section>
          <CreateActions push={push} />
        </ActionPanel>
      }
    />
  );
}
