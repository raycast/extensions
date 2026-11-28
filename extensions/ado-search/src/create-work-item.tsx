import { getPreferenceValues } from "@raycast/api";
import { CreateWorkItemForm } from "./components/create-work-item-form";

export default function Command() {
  const p = getPreferenceValues<Preferences.CreateWorkItem>();
  return (
    <CreateWorkItemForm
      knownProjects={[]}
      standalone
      defaults={{
        project: p.defaultProject,
        type: p.defaultType,
        area: p.defaultArea,
        sprint: p.defaultSprint,
        assignee: p.defaultAssignee,
        createBranch: p.defaultCreateBranch,
      }}
    />
  );
}
