import { Action, Icon } from "@raycast/api";
import { ProjectForm } from "../ProjectForm";

interface CreateProjectActionProps {
  onSave: () => Promise<void>;
  showShortcut?: boolean;
}

export function CreateProjectAction({ onSave, showShortcut = true }: CreateProjectActionProps) {
  return (
    <Action.Push
      title="Create New Project"
      icon={Icon.Plus}
      target={<ProjectForm onSave={onSave} />}
      shortcut={showShortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}
