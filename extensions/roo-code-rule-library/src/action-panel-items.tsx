import { Action, ActionPanel, Icon, Color, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import AddRuleForm from "./add-rule-form";
import EditTagsForm from "./tag-library";
import AddTagForm from "./add-tag-form";
import { Rule, Tag } from "./types";
import { getMostRecentProjectPath } from "./utils/vscode-utils";

export function AddRuleAction({ onRuleAdded }: { onRuleAdded: (rule: Rule | undefined) => void }) {
  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="New Rule"
      target={<AddRuleForm onRuleAdded={onRuleAdded} />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

export function ApplyRuleAction({
  rule,
  onApplyRule,
}: {
  rule: Rule;
  onApplyRule: (rule: Rule, projectPath: string) => Promise<void>;
}) {
  return (
    <Action
      icon={Icon.CheckCircle}
      title="Apply Rule"
      onAction={async () => {
        const projectPath = await getMostRecentProjectPath();
        if (!projectPath) {
          showToast({
            style: Toast.Style.Failure,
            title: "Could not determine project path",
            message: "Please open a recent project in VS Code.",
          });
          return;
        }
        await onApplyRule(rule, projectPath);
      }}
    />
  );
}

export function TogglePinRuleAction({ rule, onTogglePin }: { rule: Rule; onTogglePin: (rule: Rule) => Promise<void> }) {
  return rule.isPinned ? (
    <Action
      icon={Icon.StarDisabled}
      title="Unpin Rule"
      onAction={() => onTogglePin(rule)}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
    />
  ) : (
    <Action
      icon={Icon.Star}
      title="Pin Rule"
      onAction={() => onTogglePin(rule)}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
    />
  );
}

export function EditRuleAction({ rule, onRuleAdded }: { rule: Rule; onRuleAdded: () => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Rule"
      target={<AddRuleForm onRuleAdded={onRuleAdded} initialRule={rule} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

export function DeleteRuleAction({ rule, onDeleteRule }: { rule: Rule; onDeleteRule: (rule: Rule) => Promise<void> }) {
  return (
    <Action
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      title="Delete Rule"
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Delete ${rule.title}?`,
            message: "You will not be able to recover it",
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          onDeleteRule(rule);
        }
      }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );
}

export function EditTagsAction({ onPop }: { onPop?: () => void }) {
  return (
    <Action.Push
      icon={Icon.Tag}
      title="Manage Tags"
      target={<EditTagsForm />}
      onPop={onPop}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
    />
  );
}

export function AddTagAction({ onTagSaved }: { onTagSaved: (tag: Tag | undefined) => void }) {
  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="New Tag"
      target={<AddTagForm onTagSaved={onTagSaved} />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

export function RestoreDefaultTagAction({ onRestore }: { onRestore: () => void }) {
  return <Action icon={Icon.ArrowCounterClockwise} title="Restore Default Tags" onAction={onRestore} />;
}

export function TagListActions({
  onTagSaved,
  handleRestoreDefaultTags,
}: {
  onTagSaved: (tag: Tag | undefined) => void;
  handleRestoreDefaultTags: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <AddTagAction onTagSaved={onTagSaved} />
      <RestoreDefaultTagAction onRestore={handleRestoreDefaultTags} />
    </ActionPanel>
  );
}

export function TagItemActions({
  tag,
  onTagSaved,
  handleDeleteTag,
  handleRestoreDefaultTags,
}: {
  tag: Tag;
  onTagSaved: (tag: Tag | undefined) => void;
  handleDeleteTag: (tag: Tag) => Promise<void>;
  handleRestoreDefaultTags: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <AddTagAction onTagSaved={onTagSaved} />
      <Action.Push
        icon={Icon.Pencil}
        title="Edit Tag"
        target={<AddTagForm tag={tag} onTagSaved={onTagSaved} />}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
      <Action
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        title="Delete Tag"
        onAction={() => handleDeleteTag(tag)}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <RestoreDefaultTagAction onRestore={handleRestoreDefaultTags} />
    </ActionPanel>
  );
}
