import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import React from "react";
import { McpServerConfig } from "../../mcp/types";
import { McpServerFormConfig } from "./form/config";
import { DeleteMcpServer, GetMcpServerConfig } from "./function";

export function McpServerView(): React.JSX.Element {
  const {
    value: McpServer,
    setValue: setMcpServer,
    isLoading: isLoadingMcpServer,
  } = useLocalStorage<McpServerConfig>("mcp_server_config", { mcpServers: {} });
  const [showForm, setShowForm] = React.useState<boolean>(false);
  const [showDetail, setShowDetail] = React.useState<boolean>(false);

  function ActionPanelMain(props: { mcpServerName?: string }): React.JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Mcp Server">
          {McpServer && (
            <Action
              title="Show Detail"
              icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
              onAction={() =>
                setShowDetail((prev) => {
                  return !prev;
                })
              }
            />
          )}
          {McpServer && (
            <Action
              title="Add"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => setShowForm(true)}
            />
          )}
          {props.mcpServerName && McpServer && (
            <Action
              title="Edit"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => {
                form.current = (
                  <McpServerFormConfig
                    setShow={setShowForm}
                    config={McpServer}
                    setConfig={setMcpServer}
                    configName={props.mcpServerName}
                  />
                );
                setShowForm(true);
              }}
            />
          )}
          {props.mcpServerName && McpServer && (
            <ActionPanel.Submenu title="Delete" icon={Icon.Trash}>
              <Action
                title={`Yes, Delete "${props.mcpServerName}" Mcp Server`}
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await DeleteMcpServer(props.mcpServerName as string, McpServer, setMcpServer);
                }}
              />
              <Action title="No" icon={Icon.XMarkCircle} />
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function DetailMain(props: { config: McpServerConfig; name: string }): React.JSX.Element {
    const config = GetMcpServerConfig(props.config, props.name);
    const configMarkdown = `\`\`\`JSON\n${JSON.stringify(config, null, 2)}\n\`\`\``;
    return <List.Item.Detail markdown={configMarkdown} />;
  }

  const form = React.useRef<React.JSX.Element | undefined>();
  React.useEffect(() => {
    if (McpServer && !showForm) {
      form.current = <McpServerFormConfig setShow={setShowForm} config={McpServer} setConfig={setMcpServer} />;
    }
  }, [McpServer, showForm]);

  if (showForm && McpServer && form.current) return form.current;

  return (
    <List isLoading={isLoadingMcpServer || !McpServer} isShowingDetail={showDetail} actions={<ActionPanelMain />}>
      {McpServer && Object.keys(McpServer.mcpServers).length > 0 ? (
        Object.keys(McpServer.mcpServers).map((key) => {
          return (
            <List.Item
              title={key}
              icon={Icon.WrenchScrewdriver}
              key={key}
              id={key}
              detail={<DetailMain config={McpServer} name={key} />}
              actions={<ActionPanelMain mcpServerName={key} />}
            />
          );
        })
      ) : (
        <List.EmptyView
          icon={Icon.WrenchScrewdriver}
          title="No Mcp Server configured"
          description="You can add new Mcp Server using ⌘+D shortcut."
        />
      )}
    </List>
  );
}
