import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { ResourceServer, Tenant } from "../utils/types";
import ManagePermissions from "./ManagePermissions";
import { escapeTableCell } from "../utils/formatting";

interface ApiDetailProps {
  api: ResourceServer;
  tenant: Tenant;
}

function boolLabel(value?: boolean): string {
  return value === true ? "Yes" : value === false ? "No" : "—";
}

/** Detail view showing an Auth0 API (resource server) configuration and scopes. */
export default function ApiDetail({ api, tenant }: ApiDetailProps) {
  const domain = tenant.domain;

  const scopesSection =
    api.scopes && api.scopes.length > 0
      ? `\n### Scopes\n${api.scopes.map((s) => `- \`${escapeTableCell(s.value)}\`${s.description ? ` — ${escapeTableCell(s.description)}` : ""}`).join("\n")}\n`
      : "";

  const markdown = `# ${api.name ?? "Unnamed API"}

| Field | Value |
|---|---|
| **ID** | ${escapeTableCell(api.id)} |
| **Name** | ${api.name ? escapeTableCell(api.name) : "—"} |
| **Identifier** | ${escapeTableCell(api.identifier)} |
| **Signing Algorithm** | ${api.signing_alg ? escapeTableCell(api.signing_alg) : "—"} |
| **Token Lifetime** | ${api.token_lifetime != null ? `${api.token_lifetime} seconds` : "—"} |
| **Token Lifetime (Web)** | ${api.token_lifetime_for_web != null ? `${api.token_lifetime_for_web} seconds` : "—"} |
| **Token Dialect** | ${api.token_dialect ? escapeTableCell(api.token_dialect) : "—"} |
| **Allow Offline Access** | ${boolLabel(api.allow_offline_access)} |
| **Skip Consent (1st Party)** | ${boolLabel(api.skip_consent_for_verifiable_first_party_clients)} |
| **Enforce Policies** | ${boolLabel(api.enforce_policies)} |
${scopesSection}`;

  const dashboardUrl = `https://${domain}/admin/apis/${api.id}/settings`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={api.name ?? "API Detail"}
      actions={
        <ActionPanel>
          <Action.Push
            title="Manage Permissions"
            icon={Icon.Key}
            target={<ManagePermissions api={api} tenant={tenant} />}
          />
          <Action.CopyToClipboard
            title="Copy Identifier"
            content={api.identifier}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Open in Auth0 Dashboard"
            url={dashboardUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy API JSON"
            content={JSON.stringify(api, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
