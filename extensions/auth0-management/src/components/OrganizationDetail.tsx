import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { Organization, Tenant } from "../utils/types";
import AssignUserToOrg from "./AssignUserToOrg";
import { escapeTableCell } from "../utils/formatting";

interface OrganizationDetailProps {
  organization: Organization;
  tenant: Tenant;
}

/** Detail view showing an organization's metadata, branding, and action to assign users. */
export default function OrganizationDetail({ organization, tenant }: OrganizationDetailProps) {
  const domain = tenant.domain;
  const metadataKeys =
    organization.metadata && Object.keys(organization.metadata).length > 0
      ? Object.entries(organization.metadata)
          .map(([k, v]) => `${escapeTableCell(k)}: ${escapeTableCell(v)}`)
          .join(", ")
      : "—";

  const brandingColors = organization.branding?.colors
    ? [organization.branding.colors.primary, organization.branding.colors.page_background].filter(Boolean).join(", ")
    : "—";

  const markdown = `# ${organization.display_name || organization.name}

${organization.branding?.logo_url ? `![Logo](${organization.branding.logo_url})` : ""}

| Field | Value |
|---|---|
| **ID** | ${escapeTableCell(organization.id)} |
| **Name** | ${escapeTableCell(organization.name)} |
| **Display Name** | ${organization.display_name ? escapeTableCell(organization.display_name) : "—"} |
| **Branding Logo** | ${organization.branding?.logo_url ? escapeTableCell(organization.branding.logo_url) : "—"} |
| **Branding Colors** | ${brandingColors} |
| **Metadata** | ${metadataKeys} |
`;

  const dashboardUrl = `https://${domain}/admin/organizations/${organization.id}/overview`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={organization.display_name || organization.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Assign User"
            icon={Icon.AddPerson}
            target={<AssignUserToOrg tenant={tenant} organization={organization} />}
          />
          <Action.CopyToClipboard
            title="Copy Org ID"
            content={organization.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy Org Name"
            content={organization.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Open in Auth0 Dashboard"
            url={dashboardUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Org JSON"
            content={JSON.stringify(organization, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
