import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import React from "react";
import { McpServerConfig, McpServerTool } from "../../mcp/types";
import { McpServerFormConfig } from "./form/config";
import { DeleteMcpServer, GetMcpServerConfig } from "./function";
import { McpClient } from "../../mcp/mcp";

export function McpServerView(): React.JSX.Element {
  const {
    value: McpServer,
    setValue: setMcpServer,
    isLoading: isLoadingMcpServer,
  } = useLocalStorage<McpServerConfig>("mcp_server_config", { mcpServers: {} });
  const [showForm, setShowForm] = React.useState<boolean>(false);
  const [showDetail, setShowDetail] = React.useState<boolean>(false);

  // Reachability and tools state per server
  const [serverStatus, setServerStatus] = React.useState<Record<string, "checking" | "up" | "down">>({});
  const [serverTools, setServerTools] = React.useState<Record<string, McpServerTool[]>>({});

  // Check reachability and list tools for each server
  React.useEffect(() => {
    if (!McpServer || !McpServer.mcpServers) return;
    const names = Object.keys(McpServer.mcpServers);
    let cancelled = false;

    // mark all as checking
    setServerStatus((prev) => {
      const next = { ...prev } as Record<string, "checking" | "up" | "down">;
      names.forEach((n) => (next[n] = "checking"));
      return next;
    });

    (async () => {
      await Promise.all(
        names.map(async (name) => {
          try {
            const params = McpServer.mcpServers[name];
            const client = new McpClient(params);
            const tools = await client.GetTools(false);
            if (cancelled) return;
            setServerStatus((prev) => ({ ...prev, [name]: "up" }));
            setServerTools((prev) => ({ ...prev, [name]: tools }));
          } catch (e) {
            if (cancelled) return;
            setServerStatus((prev) => ({ ...prev, [name]: "down" }));
            setServerTools((prev) => ({ ...prev, [name]: [] }));
          }
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [McpServer]);

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

  function DetailMain(props: { config: McpServerConfig; name: string; tools?: McpServerTool[] }): React.JSX.Element {
    const config = GetMcpServerConfig(props.config, props.name);
    const configMarkdown = `\n### Configuration\n\n\`\`\`JSON\n${JSON.stringify(config, null, 2)}\n\`\`\`\n`;

    const tools = props.tools || [];
    const toolsMarkdown = (() => {
      if (!tools.length) return "\n### Tools (0)\n\n_No tools listed or server unreachable._\n";

      const blocks = tools.map((t) => {
        // Render arguments from JSON Schema if available
        const schema: any = t.inputSchema || {};
        const props: Record<string, any> = schema.properties || {};
        const req = new Set<string>(schema.required || []);
        const propNames = Object.keys(props);

        let argsMd = "";
        if (propNames.length > 0) {
          const argLines = propNames.map((p) => {
            const prop = props[p] || {};
            const type = Array.isArray(prop.type) ? prop.type.join("|") : prop.type || "any";
            const need = req.has(p) ? "required" : "optional";
            const desc = prop.description ? ` — ${prop.description}` : "";
            return `    - \`${p}\` (${type}, ${need})${desc}`;
          });
          argsMd = `\n  - Args:\n${argLines.join("\n")}`;
        } else if (Object.keys(schema).length > 0) {
          // Fallback: show the raw schema if no properties present
          argsMd = `\n  - Args Schema:\n\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n`;
        }

        const desc = t.description ? ` — ${t.description}` : "";
        return `- **${t.name}**${desc}${argsMd}`;
      });

      return `\n### Tools (${tools.length})\n\n${blocks.join("\n")}\n`;
    })();

    return <List.Item.Detail markdown={`${configMarkdown}${toolsMarkdown}`} />;
  }

  const form = React.useRef<React.JSX.Element | undefined>(undefined);
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
          const status = serverStatus[key] || "checking";
          const tint = status === "up" ? Color.Green : status === "down" ? Color.SecondaryText : Color.Yellow;
          const tip = status === "up" ? "Reachable" : status === "down" ? "Not Reachable" : "Checking";
          return (
            <List.Item
              title={key}
              icon={Icon.WrenchScrewdriver}
              key={key}
              id={key}
              accessories={[{ icon: { source: Icon.WrenchScrewdriver, tintColor: tint }, tooltip: tip }]}
              detail={<DetailMain config={McpServer} name={key} tools={serverTools[key]} />}
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
