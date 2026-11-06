import { Action, ActionPanel, Detail, Icon, List, getPreferenceValues, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { inspectModel, ModelInventory, validatePort } from "./lib/bridge";

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&");
}

export default function InspectModel() {
  const { bridgePort } = getPreferenceValues<{ bridgePort: string }>();
  const [scope, setScope] = useState<"all" | "visible">("all");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ModelInventory>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(undefined);
    setError(undefined);
    const load = async () => {
      try {
        const result = await inspectModel(validatePort(bridgePort), scope, controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [bridgePort, scope, revision]);

  if (error) {
    return (
      <Detail
        markdown={`# Connect Plasticity\n\n${escapeMarkdown(error)}\n\nEnable the Blender bridge in Plasticity and start its server. A bridge-capable license is required. The extension connects only to this Mac and reads the current model; it does not edit or export geometry.\n\nThe default port is **8980**. If you changed it in Plasticity, update this extension’s Bridge Port preference.`}
        actions={
          <ActionPanel>
            <Action title="Retry Connection" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action.OpenInBrowser
              title="Read Official Bridge Source"
              url="https://github.com/nkallen/plasticity-blender-addon"
            />
          </ActionPanel>
        }
      />
    );
  }
  const parents = new Map(data?.objects.map((object) => [object.id, object.name || `${object.type} ${object.id}`]));
  const report = data ? JSON.stringify(data, null, 2) : "";
  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={data?.filename || "Plasticity Model Objects"}
      searchBarPlaceholder="Search object names or types"
      searchBarAccessory={
        <List.Dropdown tooltip="Object Scope" onChange={(value) => setScope(value as "all" | "visible")}>
          <List.Dropdown.Item title="All Objects" value="all" />
          <List.Dropdown.Item title="Visible Objects" value="visible" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={loading ? "Reading Plasticity model…" : "No Model Objects"}
        description="Open a model in Plasticity, then refresh."
        actions={
          <ActionPanel>
            <Action title="Refresh Model" onAction={refresh} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
      <List.Section
        title={`${data?.objects.length ?? 0} objects`}
        subtitle={data ? `Model version ${data.version}` : undefined}
      >
        {data?.objects.map((object) => (
          <List.Item
            key={object.id}
            title={object.name || `${object.type} ${object.id}`}
            icon={object.type === "Group" ? Icon.Folder : Icon.Box}
            keywords={[object.type, String(object.id)]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={object.type} />
                    <List.Item.Detail.Metadata.Label title="Object ID" text={String(object.id)} />
                    <List.Item.Detail.Metadata.Label
                      title="Parent"
                      text={parents.get(object.parentId) || "Model Root"}
                    />
                    <List.Item.Detail.Metadata.Label title="Vertices" text={String(object.vertices)} />
                    <List.Item.Detail.Metadata.Label title="Triangles" text={String(object.triangles)} />
                    <List.Item.Detail.Metadata.Label
                      title="Scope"
                      text={scope === "all" ? "All Objects" : "Visible Objects"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Object Information" content={JSON.stringify(object, null, 2)} />
                <Action.CopyToClipboard title="Copy Model Inventory" content={report} />
                <Action.CopyToClipboard
                  title="Copy Object Name"
                  content={object.name || `${object.type} ${object.id}`}
                />
                <Action
                  title="Refresh Model"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
