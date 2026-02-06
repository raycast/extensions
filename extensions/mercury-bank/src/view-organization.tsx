import { Action, ActionPanel, Detail } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useOrganization } from "./lib/hooks/useOrganization";

export default function ViewOrganization() {
  return (
    <FeatureGuard feature="organization">
      {(apiKey, accountName) => (
        <OrganizationDetail apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function OrganizationDetail({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: org, isLoading } = useOrganization(apiKey);

  const markdown = org
    ? `# ${org.legalBusinessName}

${org.kind ? `**Kind:** ${org.kind}\n\n` : ""}
${org.ein ? `**EIN:** ${org.ein}\n\n` : ""}
${org.dbas && org.dbas.length > 0 ? `**DBAs:** ${org.dbas.join(", ")}\n\n` : ""}
${org.createdAt ? `**Created At:** ${org.createdAt}\n\n` : ""}`
    : "Loading...";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      markdown={markdown}
      metadata={
        org ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Legal Name"
              text={org.legalBusinessName}
            />
            {org.kind && <Detail.Metadata.Label title="Kind" text={org.kind} />}
            {org.ein && <Detail.Metadata.Label title="EIN" text={org.ein} />}
            {org.dbas && org.dbas.length > 0 && (
              <Detail.Metadata.Label title="DBAs" text={org.dbas.join(", ")} />
            )}
            {org.createdAt && (
              <Detail.Metadata.Label title="Created At" text={org.createdAt} />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {org?.ein && (
            <Action.CopyToClipboard title="Copy Ein" content={org.ein} />
          )}
          {org && (
            <Action.CopyToClipboard
              title="Copy Legal Name"
              content={org.legalBusinessName}
            />
          )}
          <AccountSwitcherActions />
        </ActionPanel>
      }
    />
  );
}