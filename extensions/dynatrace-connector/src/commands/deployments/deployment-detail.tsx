import { Detail, ActionPanel, Action } from "@raycast/api";
import { Deployment } from "../../lib/types/deployment";
import type { TenantConfig } from "../../lib/auth";

interface Props {
  deployment: Deployment;
  tenant: TenantConfig;
}

export default function DeploymentDetailView({ deployment, tenant }: Props) {
  const markdown = `
# ${deployment["event.name"]}

## Deployment Info
- **ID**: ${deployment["event.id"]}
- **Type**: ${deployment["event.type"]}
- **Started**: ${formatDateTime(deployment["event.start"])}
- **Provider**: ${deployment["event.provider"] || "Unknown"}

## Entity
- **Name**: ${deployment.affected_entity_name || "Unknown"}
- **Version**: ${deployment["deployment.version"] || "Not specified"}
- **Release Stage**: ${deployment["deployment.release_stage"] || "Unknown"}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={deployment["event.id"]} title="Copy Deployment ID" />
          <Action.CopyToClipboard
            content={`${tenant.tenantEndpoint}/ui/events/${deployment["event.id"]}`}
            title="Copy Deployment URL"
          />
        </ActionPanel>
      }
    />
  );
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}
