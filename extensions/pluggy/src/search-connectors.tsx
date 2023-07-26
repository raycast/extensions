import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Connector } from "pluggy-sdk";
import { PLUGGY_DEMO_URL } from "./constants";
import { useConnectors } from "./hooks";

function getConnectorSubtitle(status?: string): string | undefined {
  if (!status) {
    return;
  }

  switch (status) {
    case "ONLINE":
      return "🟢 ONLINE";
    case "OFFLINE":
      return "🔴 OFFLINE";
    case "UNSTABLE":
      return "🟡 UNSTABLE";
  }
}

function connectorToMarkdown(connector: Connector): string {
  return `
\`\`\`json
${JSON.stringify(connector, null, 2)}
\`\`\`
`;
}

export default function Command() {
  const connectors = useConnectors();

  const ActionConnectItem = ({ connector }: { connector: Connector }) => (
    <Action.OpenInBrowser title="Connect Item" url={`${PLUGGY_DEMO_URL}?connector_id=${connector.id}`} />
  );

  return (
    <List isLoading={connectors.length === 0}>
      {connectors
        .sort((a, b) => a.id - b.id)
        .map((connector) => (
          <List.Item
            key={connector.id}
            title={connector.name}
            icon={connector.imageUrl}
            subtitle={getConnectorSubtitle(connector.health?.status)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Connector Details"
                  target={
                    <Detail
                      markdown={connectorToMarkdown(connector)}
                      actions={
                        <ActionPanel>
                          <ActionConnectItem connector={connector} />
                          <Action.CopyToClipboard
                            title="Copy Connector JSON"
                            content={JSON.stringify(connector, null, 2)}
                          />
                        </ActionPanel>
                      }
                    />
                  }
                />
                <ActionConnectItem connector={connector} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
