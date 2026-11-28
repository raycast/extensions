import { getPreferenceValues } from "@raycast/api";
import { CreateWorkItemForm } from "../create-work-item-form";

/**
 * The work item form, started as a Task of a sprint: project, type, sprint and parent come filled in and
 * can still be changed.
 */
export function NewTaskForm({
  iterationPath,
  parentId,
  onCreated,
}: {
  iterationPath: string;
  parentId?: number;
  onCreated: () => void;
}) {
  const { projectName } = getPreferenceValues<Preferences>();
  return (
    <CreateWorkItemForm
      knownProjects={[]}
      navigationTitle="New Task"
      onCreated={onCreated}
      initial={{ project: projectName, type: "Task", iterationPath, parentId, createBranch: false }}
    />
  );
}
