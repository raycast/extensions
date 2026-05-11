import { Detail, ActionPanel, Action } from "@raycast/api";
import { Auth0App, Tenant } from "../utils/types";
import { escapeTableCell, APP_TYPE_LABELS, parseTenantDomain } from "../utils/formatting";

interface AppDetailProps {
  app: Auth0App;
  tenant: Tenant;
}

function renderUrlList(title: string, urls?: string[]): string {
  if (!urls || urls.length === 0) return "";
  const items = urls.map((u) => `- ${escapeTableCell(u)}`).join("\n");
  return `\n### ${title}\n${items}\n`;
}

/** Detail view showing an Auth0 application's configuration and allowed URLs. */
export default function AppDetail({ app, tenant }: AppDetailProps) {
  const domain = tenant.domain;
  const appTypeLabel = app.app_type ? (APP_TYPE_LABELS[app.app_type] ?? app.app_type) : "—";
  const grantTypes = app.grant_types?.length ? app.grant_types.map((g) => escapeTableCell(g)).join(", ") : "—";

  const metadataSection =
    app.client_metadata && Object.keys(app.client_metadata).length > 0
      ? `\n### Metadata\n${Object.entries(app.client_metadata)
          .map(([k, v]) => `- **${escapeTableCell(k)}**: ${escapeTableCell(v)}`)
          .join("\n")}\n`
      : "";

  const markdown = `# ${app.name ?? "Unnamed App"}

${app.logo_uri ? `![Logo](${app.logo_uri})` : ""}

| Field | Value |
|---|---|
| **Client ID** | ${escapeTableCell(app.client_id)} |
| **Name** | ${app.name ? escapeTableCell(app.name) : "—"} |
| **Description** | ${app.description ? escapeTableCell(app.description) : "—"} |
| **App Type** | ${appTypeLabel} |
| **First Party** | ${app.is_first_party ? "Yes" : "No"} |
| **Token Endpoint Auth** | ${app.token_endpoint_auth_method ? escapeTableCell(app.token_endpoint_auth_method) : "—"} |
| **Grant Types** | ${grantTypes} |
${renderUrlList("Callbacks", app.callbacks)}${renderUrlList("Allowed Origins", app.allowed_origins)}${renderUrlList("Web Origins", app.web_origins)}${renderUrlList("Allowed Logout URLs", app.allowed_logout_urls)}${metadataSection}`;

  const { tenantSlug, region } = parseTenantDomain(domain);
  const dashboardUrl = `https://manage.auth0.com/dashboard/${region}/${tenantSlug}/applications/${app.client_id}/settings`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={app.name ?? "App Detail"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Client ID"
            content={app.client_id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Open in Auth0 Dashboard"
            url={dashboardUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy App JSON"
            content={JSON.stringify(app, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
