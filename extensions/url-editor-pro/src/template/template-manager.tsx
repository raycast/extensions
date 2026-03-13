import { ActionPanel, Action, List, Icon, Keyboard, Alert, confirmAlert, Color } from "@raycast/api";
import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { TemplateGroup } from "../types";
import { EditTemplateGroupForm } from "./edit-template-group-form";
import { DEFAULT_TEMPLATE_GROUPS } from "./template-group-config";

export function TemplateManager() {
  const [templateGroups, setTemplateGroups] = useCachedState<TemplateGroup[]>(
    "template-groups",
    DEFAULT_TEMPLATE_GROUPS,
  );
  const [searchText, setSearchText] = useState("");

  // Filter template groups based on search
  const filteredGroups = templateGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchText.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      group.templates.some((t) => t.toLowerCase().includes(searchText.toLowerCase())),
  );

  async function handleDelete(groupId: string) {
    const group = templateGroups.find((g) => g.id === groupId);
    if (!group) return;

    await confirmAlert({
      title: "Delete Template Group",
      message: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setTemplateGroups(templateGroups.filter((g) => g.id !== groupId));
        },
      },
    });
  }

  function handleToggleEnabled(groupId: string) {
    setTemplateGroups(
      templateGroups.map((group) =>
        group.id === groupId ? { ...group, enabled: group.enabled !== false ? false : true } : group,
      ),
    );
  }

  function handleDuplicate(group: TemplateGroup) {
    const newGroup: TemplateGroup = {
      ...group,
      id: `${group.id}-copy-${Date.now()}`,
      name: `${group.name} (Copy)`,
    };
    setTemplateGroups([...templateGroups, newGroup]);
  }

  return (
    <List
      searchBarPlaceholder="Search template groups..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredGroups.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No template groups found"
          description="Try adjusting your search or create a new template group"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Template Group"
                icon={Icon.Plus}
                target={<EditTemplateGroupForm onSave={setTemplateGroups} existingGroups={templateGroups} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredGroups.map((group) => (
          <List.Item
            key={group.id}
            id={group.id}
            title={group.name}
            subtitle={group.description}
            icon={group.enabled !== false ? Icon.Link : Icon.CircleDisabled}
            accessories={[
              {
                text: `${group.templates.length} template${group.templates.length !== 1 ? "s" : ""}`,
                icon: Icon.Document,
              },
              {
                tag: {
                  value: group.enabled !== false ? "Enabled" : "Disabled",
                  color: group.enabled !== false ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={group.name} />
                    <List.Item.Detail.Metadata.Separator />
                    {group.description && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Description" text={group.description} />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={group.enabled !== false ? "Enabled" : "Disabled"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Templates"
                      text={`${group.templates.length} template${group.templates.length !== 1 ? "s" : ""}`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Template List" />
                    {group.templates.map((template, index) => (
                      <List.Item.Detail.Metadata.Label key={index} title={`${index + 1}.`} text={template} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Template Group"
                  icon={Icon.Pencil}
                  target={
                    <EditTemplateGroupForm group={group} onSave={setTemplateGroups} existingGroups={templateGroups} />
                  }
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action
                  title={group.enabled !== false ? "Disable" : "Enable"}
                  icon={group.enabled !== false ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => handleToggleEnabled(group.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action
                  title="Duplicate"
                  icon={Icon.CopyClipboard}
                  onAction={() => handleDuplicate(group)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.Push
                  title="Create New Template Group"
                  icon={Icon.Plus}
                  target={<EditTemplateGroupForm onSave={setTemplateGroups} existingGroups={templateGroups} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Template Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(group.id)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
