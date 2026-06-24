import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TanaTag, TanaWorkspace } from "../api/contracts";
import { requireTools } from "../api/capabilities";
import { createPreferenceClient, getTanaPreferences } from "../api/preferenceClient";
import { listTags, listWorkspaces } from "../api/tanaService";
import { AddFieldToTagAction } from "./AddFieldToTagForm";
import { SetTagCheckboxAction } from "./SetTagCheckboxForm";
import { CreateSupertagAction } from "./SupertagCreateForm";
import { TagSchemaDetail } from "./TagSchemaDetail";

export function SupertagsList() {
  const configuredWorkspaceId = getTanaPreferences().workspaceId?.trim() || "";
  const [workspaceId, setWorkspaceId] = useState(configuredWorkspaceId);
  const [workspaces, setWorkspaces] = useState<TanaWorkspace[]>([]);
  const [tags, setTags] = useState<TanaTag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = async () => {
    try {
      const client = createPreferenceClient(workspaceId);
      await requireTools(client, [
        "list_workspaces",
        "list_tags",
        "get_tag_schema",
        "create_tag",
        "add_field_to_tag",
        "set_tag_checkbox",
      ]);
      const items = await listWorkspaces(client);
      const available = items.length
        ? items
        : configuredWorkspaceId
          ? [{ id: configuredWorkspaceId, name: "Configured Workspace" }]
          : [];
      setWorkspaces(available);
      if (!available.some(({ id }) => id === workspaceId) && available[0]) setWorkspaceId(available[0].id);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not list workspaces",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const loadTags = async () => {
    if (!workspaceId) {
      setTags([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTags(await listTags(createPreferenceClient(workspaceId), workspaceId));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not list Supertags",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    void loadTags();
  }, [workspaceId]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search Supertags..."
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {workspaces.map((workspace) => (
            <List.Dropdown.Item key={workspace.id} title={workspace.name || workspace.id} value={workspace.id} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <CreateSupertagAction workspaceId={workspaceId} onCreate={loadTags} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTags} />
        </ActionPanel>
      }
    >
      {tags.map((tag) => (
        <List.Item
          key={tag.id}
          id={tag.id}
          title={tag.name}
          icon={{ source: Icon.Tag, tintColor: tag.color }}
          accessories={[{ tag: tag.id }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Schema"
                icon={Icon.Sidebar}
                target={<TagSchemaDetail tag={tag} workspaceId={workspaceId} />}
              />
              <AddFieldToTagAction tag={tag} workspaceId={workspaceId} onComplete={loadTags} />
              <SetTagCheckboxAction tag={tag} workspaceId={workspaceId} onComplete={loadTags} />
              <CreateSupertagAction workspaceId={workspaceId} onCreate={loadTags} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTags} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
