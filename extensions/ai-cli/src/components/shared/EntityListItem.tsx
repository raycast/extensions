import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import CreateEntityAction from "./CreateEntityAction";
import { messages } from "@/locale/en/messages";

interface EntityListItemProps<T = unknown> {
  entity: T & { id: string; name: string };
  subtitle: string;
  icon: Icon | string;
  accessories?: List.Item.Accessory[];
  onEdit: (entity: T & { id: string; name: string }) => void;
  onDelete: (entity: T & { id: string; name: string }) => void;
  onCreate: () => void;
  copyContent: string;
  entityType: "template" | "tone";
}

export default function EntityListItem<T>({
  entity,
  subtitle,
  icon,
  accessories,
  onEdit,
  onDelete,
  onCreate,
  copyContent,
  entityType,
}: EntityListItemProps<T>) {
  if (!entity) {
    return null;
  }

  // Determine entity-specific messages based on entityType
  const entityMessages = {
    copyTitle:
      entityType === "template"
        ? messages.management.entityActions.copyTemplate
        : messages.management.entityActions.copyTone,
    editTitle:
      entityType === "template"
        ? messages.management.entityActions.editTemplate
        : messages.management.entityActions.editTone,
    deleteTitle:
      entityType === "template"
        ? messages.management.entityActions.deleteTemplate
        : messages.management.entityActions.deleteTone,
    createTitle:
      entityType === "template"
        ? messages.management.entityActions.createTemplate
        : messages.management.entityActions.createTone,
  };

  return (
    <List.Item
      key={entity.id}
      title={entity.name}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          {/* PRIMARY ACTION: No section wrapper - gets automatic shortcuts (↵, ⌘↵) */}
          <Action
            title={entityMessages.editTitle}
            icon={Icon.Pencil}
            onAction={() => onEdit(entity)}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />

          {/* SECONDARY ACTIONS: Grouped operations */}
          <ActionPanel.Section>
            <CreateEntityAction title={entityMessages.createTitle} onAction={onCreate} />
            <Action.CopyToClipboard
              title={entityMessages.copyTitle}
              content={copyContent}
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>

          {/* DESTRUCTIVE ACTIONS: Separate section at bottom */}
          <ActionPanel.Section title={messages.confirmations.dangerZone}>
            <Action
              title={entityMessages.deleteTitle}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(entity)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
