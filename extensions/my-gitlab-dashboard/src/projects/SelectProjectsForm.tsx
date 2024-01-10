import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { saveMyProjects } from "../storage";
import { Project } from "../gitlab/project";

export function SelectProjectsForm(props: { allProjects: Project[]; selectedProjects: Project[] }) {
  async function storeProjects(form: { projects: string[] }) {
    if (form.projects.length > 0) {
      await saveMyProjects(form.projects.map((projId) => props.allProjects.find((proj) => proj.id === projId)!));
      showToast({ title: "Projects saved successfully" });
    } else {
      showToast({ title: "Please select at least one project", style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Projects" onSubmit={storeProjects} />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="projects"
        title="Select projects"
        info="Please note that you must be a member of a project for it to become eligible"
        defaultValue={props.selectedProjects.map((proj) => proj.id)}
      >
        {props.allProjects.map((proj) => (
          <Form.TagPicker.Item key={proj.id} value={proj.id} title={proj.name} icon={Icon.Folder} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
