import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAccount } from "./utils/buffer-api";
import { formatDate } from "./utils/helpers";

export default function AccountOverview() {
  const { data: account, isLoading, error } = usePromise(getAccount);

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  if (!account) {
    return <Detail isLoading markdown="Loading Buffer account…" />;
  }

  const organizationRows = account.organizations
    .map(
      (organization) =>
        `| ${organization.name} | ${organization.ownerEmail || "—"} | ${organization.channelCount ?? "—"} |`,
    )
    .join("\n");

  const connectedApps = account.connectedApps?.length
    ? account.connectedApps
        .map((app) => `- **${app.name}**: ${app.website}`)
        .join("\n")
    : "- No connected apps";

  const markdown = `
# Buffer Account

**Name:** ${account.name || "—"}

**Email:** ${account.email}

**Timezone:** ${account.timezone || "—"}

**Created:** ${formatDate(account.createdAt)}

## Organizations

| Name | Owner | Channels |
|------|-------|----------|
${organizationRows || "| No organizations | — | — |"}

## Connected Apps

${connectedApps}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Buffer Account"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Buffer Settings"
            url="https://publish.buffer.com/settings/api"
            icon={Icon.Gear}
          />
          <Action.CopyToClipboard
            title="Copy Account Email"
            content={account.email}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
