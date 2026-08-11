import { Action, Form, Icon, popToRoot, Image, ActionPanel, showToast, Toast } from "@raycast/api";
import { Project } from "./gitlabapi";
import { gitlab } from "./common";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { projectIcon, toFormValues } from "./utils";
import { useProject, useMilestones } from "./hooks";

interface IssueFormValues {
  project_id: number;
  title: string;
  description: string;
  assignee_ids: number[];
  labels: string[];
  milestone_id: number;
}

export default function CreateIssueFormRoot() {
  return <IssueForm />;
}

async function submit(values: IssueFormValues) {
  try {
    if (values.title === "") {
      throw Error("Please enter a title");
    }
    const formValues = toFormValues(values as unknown as Record<string, unknown>);
    console.log(formValues);
    await showToast({ style: Toast.Style.Animated, title: "Creating Issue..." });
    await gitlab.createIssue(values.project_id, formValues);
    await showToast(Toast.Style.Success, "Issue created", "Issue creation successful");
    popToRoot();
  } catch (error) {
    await showFailureToast(error, { title: "Cannot create Issue" });
  }
}

function IssueForm() {
  const [selectedProject, setSelectedProject] = useState<string>();
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    async (): Promise<Project[]> => (await gitlab.getUserProjects({}, true)) || [],
    [],
    { initialData: [] },
  );
  const { projectinfo, isLoadingProjectInfo } = useProject(selectedProject);
  let project: Project | undefined;
  if (selectedProject) {
    project = projects.find((candidate) => candidate.id.toString() === selectedProject);
  }
  const { milestoneInfo, isLoadingMilestoneInfo } = useMilestones(project?.group_id);

  const isLoading = isLoadingProjects || isLoadingProjectInfo || isLoadingMilestoneInfo;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <ProjectDropdown projects={projects} setSelectedProject={setSelectedProject} value={selectedProject} />
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.TextArea id="description" title="Description" placeholder="Enter description" />
      <Form.TagPicker id="assignee_ids" title="Assignees" placeholder="Type or choose an assignee">
        {(projectinfo?.members || []).map((member) => (
          <Form.TagPicker.Item
            key={member.id.toString()}
            value={member.id.toString()}
            title={member.name || member.username}
            icon={{ source: member.avatar_url, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="labels" title="Labels" placeholder="Type or choose an label">
        {(projectinfo?.labels || []).map((label) => (
          <Form.TagPicker.Item
            key={label.name}
            value={label.name}
            title={label.name}
            icon={{ source: Icon.Circle, tintColor: label.color }}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="milestone_id" title="Milestone">
        <Form.Dropdown.Item key="_empty" value="" title="-" />
        {projectinfo?.milestones?.map((milestone) => (
          <Form.Dropdown.Item key={milestone.id} value={milestone.id.toString()} title={milestone.title} />
        ))}
        {milestoneInfo?.map((milestone) => (
          <Form.Dropdown.Item key={milestone.id} value={milestone.id.toString()} title={milestone.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function ProjectDropdown(props: {
  projects: Project[];
  setSelectedProject: React.Dispatch<React.SetStateAction<string | undefined>>;
  value?: string;
}) {
  return (
    <Form.Dropdown
      id="project_id"
      title="Project"
      value={props.value}
      storeValue={true}
      onChange={(newValue: string) => {
        props.setSelectedProject(newValue);
      }}
    >
      {props.projects.map((project) => (
        <ProjectDropdownItem key={project.id} project={project} />
      ))}
    </Form.Dropdown>
  );
}

function ProjectDropdownItem(props: { project: Project }) {
  return (
    <Form.Dropdown.Item
      value={props.project.id.toString()}
      title={props.project.name_with_namespace}
      icon={projectIcon(props.project)}
    />
  );
}
