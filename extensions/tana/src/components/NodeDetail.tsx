import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { ReadNodeResult } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { readNode } from "../api/tanaService";
import { openNodeInTana } from "../openInTana";
import { ChildrenList } from "./ChildrenList";
import type { NodeRef } from "./NodeActions";

export function NodeDetail({ node }: { node: NodeRef }) {
  const [result, setResult] = useState<ReadNodeResult>();
  const [error, setError] = useState<string>();
  const client = createPreferenceClient(node.workspaceId);

  useEffect(() => {
    const controller = new AbortController();
    readNode(client, node.id, 2, controller.signal).then(setResult, (reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to read node");
    });
    return () => controller.abort();
  }, [node.id, node.workspaceId]);

  return (
    <Detail
      isLoading={!result && !error}
      markdown={result?.markdown ?? (error ? `# Unable to read node\n\n${error}` : "# Loading…")}
      navigationTitle={result?.name || node.name}
      actions={
        <ActionPanel>
          <Action.Push title="Browse Children" icon={Icon.List} target={<ChildrenList node={node} />} />
          <Action title="Open in Tana" icon={Icon.AppWindow} onAction={() => openNodeInTana(client, node)} />
          <Action
            title="Open in Tana Panel"
            icon={Icon.Sidebar}
            onAction={() => openNodeInTana(client, node, "panel")}
          />
          <Action title="Open in Tana Tab" icon={Icon.Window} onAction={() => openNodeInTana(client, node, "tab")} />
          <Action.CopyToClipboard title="Copy Node ID" content={node.id} />
        </ActionPanel>
      }
    />
  );
}
