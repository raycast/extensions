import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { useExec } from "@raycast/utils";
import { getPrefs, resolveMontraPath } from "./utils/exec";

interface ApiKey {
  id: string;
  name?: string;
  created_at?: string;
  scopes?: string[];
}

export default function Command() {
  const prefs = getPrefs();
  const { isLoading, data } = useExec(resolveMontraPath(), [
    "api-key",
    "list",
    "-e",
    prefs.defaultEnvironment,
    "--output",
    "json",
  ]);
  const items = useMemo<ApiKey[]>(() => {
    try {
      return JSON.parse(data || "[]");
    } catch {
      return [];
    }
  }, [data]);

  return (
    <List isLoading={isLoading} navigationTitle="API Key: List">
      {items.map((k) => (
        <List.Item
          key={k.id}
          title={k.name || k.id}
          subtitle={k.id}
          accessories={[
            { date: k.created_at ? new Date(k.created_at) : undefined },
            { tag: (k.scopes || []).join(", ") },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy ID" content={k.id} />
              <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(k)} />
            </ActionPanel>
          }
          icon={Icon.Key}
        />
      ))}
    </List>
  );
}
