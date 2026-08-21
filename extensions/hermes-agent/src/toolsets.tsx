import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import { listToolsets, ToolsetSummary } from "./hermes-client";

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [toolsets, setToolsets] = useState<ToolsetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setToolsets(await listToolsets(config));
    } catch {
      // Silent — empty list is informative enough.
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <List isLoading={isLoading} filtering>
      {toolsets.map((ts) => (
        <List.Item
          key={ts.name}
          icon={ts.enabled ? Icon.CheckCircle : Icon.Circle}
          title={ts.name}
          subtitle={ts.label}
          accessories={[
            {
              tag: {
                value: ts.enabled ? "on" : "off",
                color: ts.enabled ? "green" : "gray",
              },
            },
            { text: `${ts.tools.length} tools` },
          ]}
          detail={
            <List.Item.Detail
              markdown={`## ${ts.label}

**${ts.name}** ${ts.enabled ? "(enabled)" : "(disabled)"}

${ts.description}

### Tools
${ts.tools.map((t) => `- \`${t}\``).join("\n")}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Toolset Name"
                content={ts.name}
              />
              <Action.CopyToClipboard
                title="Copy Tools List"
                content={ts.tools.join(", ")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Gear}
        title={isLoading ? "Loading toolsets…" : "No toolsets found"}
      />
    </List>
  );
}
