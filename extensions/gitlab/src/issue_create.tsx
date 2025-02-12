import { Action, showToast, Toast, Form, Icon, popToRoot, Image, ActionPanel } from "@raycast/api";
import { Project, User, Label, Milestone } from "./gitlabapi";
import { gitlab } from "./common";
import { useState, useEffect } from "react";
import { getErrorMessage, projectIcon, showErrorToast, toFormValues } from "./utils";
import { useCache } from "./cache";

interface IssueFormValues {
  project_id: number;
  title: string;
  description: string;
  assignee_ids: number[];
  labels: string[];
  milestone_id: number;
}

export default function CreateIssueFormRoot(): JSX.Element {
  return <IssueForm />;
}

async function submit(values: IssueFormValues) {
  try {
    if (values.title === "") {
      throw Error("Please enter a title");
    }
    const val = toFormValues(values);
    console.log(val);
    await gitlab.createIssue(values.project_id, val);
    await showToast(Toast.Style.Success, "Issue created", "Issue creation successful");
    popToRoot();
  } catch (error) {
    await showErrorToast(getErrorMessage(error));
  }
}

function IssueForm() {
  const [selectedProject, setSelectedProject] = useState<string>();
  const {
    data: projects,
    error: errorProjects,
    isLoading: isLoadingProjects,
  } = useCache<Project[]>(
    "issueFormProjects",
    async (): Promise<Project[]> => {
      const pros = (await gitlab.getUserProjects({}, true)) || [];
      return pros;
    },
    {
      deps: [],
    }
  );
  const { projectinfo, errorProjectInfo, isLoadingProjectInfo } = useProject(selectedProject);
  const members = projectinfo?.members || [];
  const labels = projectinfo?.labels || [];
  const isLoading = isLoadingProjects || isLoadingProjectInfo;
  const error = errorProjects || errorProjectInfo;

  if (error) {
    showErrorToast(error, "Cannot create Issue");
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <ProjectDropdown projects={projects || []} setSelectedProject={setSelectedProject} value={selectedProject} />
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.TextArea id="description" title="Description" placeholder="Enter description" />
      <Form.TagPicker id="assignee_ids" title="Assignees" placeholder="Type or choose an assignee">
        {members.map((member) => (
          <Form.TagPicker.Item
            key={member.id.toString()}
            value={member.id.toString()}
            title={member.name || member.username}
            icon={{ source: member.avatar_url, mask: Image.Mask.Circle }}
          />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="labels" title="Labels" placeholder="Type or choose an label">
        {labels.map((label) => (
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
        {projectinfo?.milestones?.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.id.toString()} title={m.title} />
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
  const projects = props.projects;
  return (
    <Form.Dropdown
      id="project_id"
      title="Project"
      value={props.value}
      storeValue={true}
      onChange={(val: string) => {
        props.setSelectedProject(val);
      }}
    >
      {projects?.map((project) => (
        <ProjectDropdownItem key={project.id} project={project} />
      ))}
    </Form.Dropdown>
  );
}

function ProjectDropdownItem(props: { project: Project }) {
  const pro = props.project;
  return <Form.Dropdown.Item value={pro.id.toString()} title={pro.name_with_namespace} icon={projectIcon(pro)} />;
}

export function useProject(query?: string): {
  projectinfo?: ProjectInfo;
  errorProjectInfo?: string;
  isLoadingProjectInfo: boolean;
} {
  const [projectinfo, setProjectInfo] = useState<ProjectInfo>();
  const [errorProjectInfo, setError] = useState<string>();
  const [isLoadingProjectInfo, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const proid = parseInt(query || "0");
        if (proid > 0) {
          console.log(`get projectinfo for project id '${proid}'`);
          const members = await gitlab.getProjectMember(proid);
          const labels = await gitlab.getProjectLabels(proid);
          const milestones = await gitlab.getProjectMilestones(proid);

          if (!didUnmount) {
            setProjectInfo({ ...projectinfo, members: members, labels: labels, milestones: milestones });
          }
        } else {
          console.log("no project selected");
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { projectinfo, errorProjectInfo, isLoadingProjectInfo };
}

interface ProjectInfo {
  members: User[];
  labels: Label[];
  milestones: Milestone[];
}
