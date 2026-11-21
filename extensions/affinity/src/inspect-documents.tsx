import { Action, ActionPanel, Detail, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { inspectDocuments } from "./lib/mcp";
import { DocumentInfo, escapeMarkdown } from "./lib/inspector";

function Layers({ document }: { document: DocumentInfo }) {
  return (
    <List navigationTitle={`${document.title} — Layers`} searchBarPlaceholder="Search layer names">
      <List.EmptyView title="No Layers" />
      {document.layers.map((layer, index) => (
        <List.Item
          key={index}
          title={layer.name}
          subtitle={layer.depth ? `Depth ${layer.depth}` : undefined}
          icon={layer.locked ? Icon.Lock : layer.visible ? Icon.Eye : Icon.EyeDisabled}
          accessories={[{ text: layer.visible ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Layer Name" content={layer.name} />
              <Action.CopyToClipboard title="Copy Layer Information" content={JSON.stringify(layer, null, 2)} />
            </ActionPanel>
          }
        />
      ))}
      {document.layersLimited ? (
        <List.Item
          title="Layer Inventory Limit Reached"
          subtitle="Limited to 5,000 nodes / 100 nesting levels"
          icon={Icon.Info}
        />
      ) : null}
    </List>
  );
}

export default function InspectDocuments() {
  const abortable = useRef<AbortController>(null);
  const {
    data,
    error: failure,
    isLoading: loading,
    revalidate: refresh,
  } = usePromise(() => inspectDocuments(abortable.current?.signal ?? new AbortController().signal), [], {
    abortable,
    onError: () => undefined,
  });
  const error = failure?.message;
  if (error) {
    return (
      <Detail
        markdown={`# Connect Affinity\n\n${escapeMarkdown(error)}\n\nThis command uses Affinity’s own local MCP server and a fixed read-only SDK script. Enable the MCP server in Affinity, then retry.\n\nDesktop file access, network access, saving scripts, task hints, and Canva AI features are not needed for document inspection.`}
        actions={
          <ActionPanel>
            <Action title="Retry Connection" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action.OpenInBrowser
              title="Read Affinity Connector Setup"
              url="https://www.affinity.studio/help/ai-connector-setup/"
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List isLoading={loading} isShowingDetail searchBarPlaceholder="Search open Affinity documents">
      <List.EmptyView
        title={loading ? "Reading Affinity documents…" : "No Open Documents"}
        description="Open a document in Affinity, then refresh."
        actions={
          <ActionPanel>
            <Action title="Refresh Documents" onAction={refresh} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
      {data?.documents.map((document) => (
        <List.Item
          key={document.id}
          title={document.title || "Untitled"}
          icon={document.current ? Icon.CheckCircle : Icon.Document}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Size" text={`${document.width} × ${document.height} px`} />
                  <List.Item.Detail.Metadata.Label title="DPI" text={String(document.dpi)} />
                  <List.Item.Detail.Metadata.Label
                    title="Pages / Spreads"
                    text={`${document.pages} / ${document.spreads}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Layers"
                    text={`${document.layers.length}${document.layersLimited ? "+" : ""}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Selected Nodes" text={String(document.selectionCount)} />
                  <List.Item.Detail.Metadata.Label
                    title="Changes"
                    text={document.dirty ? "Unsaved Changes" : "No Unsaved Changes"}
                  />
                  <List.Item.Detail.Metadata.Label title="Location" text={document.path || "Unsaved Document"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Inspect Layers" icon={Icon.Layers} target={<Layers document={document} />} />
              <Action.CopyToClipboard title="Copy Document Information" content={JSON.stringify(document, null, 2)} />
              {document.path ? <Action.CopyToClipboard title="Copy Document Path" content={document.path} /> : null}
              <Action
                title="Refresh Documents"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
