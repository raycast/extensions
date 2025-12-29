import { ActionPanel, Action, List } from "@raycast/api";
import ProjectForm from "./ProjectForm";
import { SHORTCUTS, Icons } from "../constants";

// ============================================
// EmptyView Component
// ============================================

interface EmptyViewProps {
  groups?: string[];
  onProjectAdded: () => void;
}

export default function EmptyView({ groups = [], onProjectAdded }: EmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icons.Document}
      title="No Projects"
      description="Add your first project to get started"
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icons.Plus}
            title="Add Project"
            shortcut={SHORTCUTS.ADD_PROJECT}
            target={<ProjectForm groups={groups} onSave={onProjectAdded} />}
          />
        </ActionPanel>
      }
    />
  );
}
