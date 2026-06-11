import { Detail, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getNetbirdStatus } from "./utils";

export default function Command() {
  const { data: status, isLoading, error } = usePromise(getNetbirdStatus);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\nFailed to fetch NetBird status.\n\n\`\`\`\n${error.message}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get Help" url="https://netbird.io/docs" />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading && !status) {
    return <Detail isLoading={true} />;
  }

  const isConnected = status?.management.connected || false;
  const connectionIcon = { source: Icon.CircleFilled, tintColor: isConnected ? Color.Green : Color.Red };

  const dnsMarkdown = status?.dnsServers?.length
    ? `\n## DNS Servers\n${status.dnsServers
        .map(
          (d) =>
            `- **${d.domains?.join(", ") || "All"}**: \`${d.servers?.join(", ") || ""}\` ${d.enabled ? "✅" : "❌"}`,
        )
        .join("\n")}`
    : "";

  const relaysMarkdown = status?.relays?.details?.length
    ? `\n## Relays (${status.relays.available}/${status.relays.total} Available)\n${status.relays.details
        .map((r) => `- \`${r.uri}\`: ${r.available ? "✅" : "❌"}`)
        .join("\n")}`
    : "";

  const markdown = `
# NetBird Status
${status?.fqdn ? `**${status.fqdn}**` : "Not Available"}

## Daemon Summary
- **Daemon Version**: \`${status?.daemonVersion || "Unknown"}\`
- **CLI Version**: \`${status?.cliVersion || "Unknown"}\`
- **NetBird IP**: \`${status?.netbirdIp || "Not Assigned"}\`

## Management
- **URL**: \`${status?.management.url || "Unknown"}\`
- **Connected**: ${status?.management.connected ? "✅" : "❌"}

## Signal Server
- **URL**: \`${status?.signal.url || "Unknown"}\`
- **Connected**: ${status?.signal.connected ? "✅" : "❌"}

## Peers Overview
- **Total Peers**: ${status?.peers.total || 0}
- **Connected Peers**: ${status?.peers.connected || 0}

## Details
- **Profile Name**: \`${status?.profileName || "Unknown"}\`
- **Lazy Connection**: \`${status?.lazyConnectionEnabled ? "Enabled" : "Disabled"}\`
${dnsMarkdown}${relaysMarkdown}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            icon={connectionIcon}
            text={isConnected ? "Connected" : "Disconnected"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Peers" text={status?.peers.total.toString() || "0"} />
          <Detail.Metadata.Label title="Connected Peers" text={status?.peers.connected.toString() || "0"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="NetBird Version" text={status?.daemonVersion || "Unknown"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy NetBird IP" content={status?.netbirdIp || ""} />
          <Action.CopyToClipboard title="Copy FQDN" content={status?.fqdn || ""} />
        </ActionPanel>
      }
    />
  );
}
