import { showToast, Toast, Form, Icon, popToRoot, Image, ActionPanel, Action } from "@raycast/api";
import { Project, Branch, Issue, TemplateDetail } from "../gitlabapi";
import { gitlab } from "../common";
import { useState, useEffect } from "react";
import { getErrorMessage, projectIcon, showErrorToast, stringToSlug, toFormValues } from "../utils";
import { useCache } from "../cache";
import { useProjectMR, useMilestones, ProjectInfoMR } from "../hooks";

interface MRFormValues {
  project_id: number;
  source_branch: string;
  target_branch: string;
  title: string;
  description: string;
  assignee_ids: number[];
  reviewer_ids: number[];
  labels: string[];
  milestone_id: number;
  remove_source_branch: boolean;
}

const NO_TEMPLATE = "no_template";

async function submit(values: MRFormValues) {
  try {
    if (values.title === "") {
      throw Error("Please enter a title");
    }
    if (values.source_branch === "") {
      throw Error("Please select a source branch");
    }
    const val = toFormValues(values as unknown as Record<string, unknown>);
    console.log(val);
    await gitlab.createMR(values.project_id, val);
    await showToast(Toast.Style.Success, "Merge Request created", "Merge Request creation successful");
    popToRoot();
  } catch (error) {
    await showErrorToast(getErrorMessage(error));
  }
}

async function getProjectBranches(projectID: number) {
  const branches = ((await gitlab.fetch(`projects/${projectID}/repository/branches`, {}, true)) as Branch[]) || [];
  const project = await gitlab.getProject(projectID);
  return { branches, project };
}

export function IssueMRCreateForm({ issue, projectID, title }: { issue: Issue; projectID: number; title: string }) {
  const branchName = `${issue.iid}-${stringToSlug(issue.title)}`;
  const [branches, setBranches] = useState<Branch[]>();
  const [project, setProject] = useState<Project>();

  useEffect(() => {
    projectID && getProjectBranches(projectID).then((data) => (setProject(data?.project), setBranches(data?.branches))); // eslint-disable-line @typescript-eslint/no-unused-expressions
  }, [projectID]);

  async function submit(values: { source_branch: string; target_branch: string }) {
    const { source_branch, target_branch } = values;
    try {
      await gitlab.post(`projects/${projectID}/repository/branches?branch=${source_branch}&ref=${target_branch}`);
      await gitlab.createMR(projectID, {
        id: projectID,
        description: `Closes #${issue.iid}`,
        source_branch: source_branch,
        target_branch: target_branch,
        title: title,
        assignee_id: project?.owner?.id,
      });
      showToast(Toast.Style.Success, "Merge Request created", "Merge Request creation successful");
      popToRoot();
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Cannot create Merge Request");
    }
  }

  return (
    <Form
      isLoading={project === undefined && branches === undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Merge Request" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source_branch"
        title="Source branch"
        placeholder="Enter source branch"
        defaultValue={branchName}
      />
      <TargetBranchDropdown project={project} info={{ branches: branches || [] }} />
    </Form>
  );
}

export function MRCreateForm(props: { project?: Project | undefined; branch?: string | undefined }) {
  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    props.project ? props.project.id.toString() : undefined,
  );
  const {
    data: projects,
    error: errorProjects,
    isLoading: isLoadingProjects,
  } = useCache<Project[]>(
    "mrFormProjects",
    async (): Promise<Project[]> => {
      const pros = (await gitlab.getUserProjects({}, true)) || [];
      return pros;
    },
    {
      deps: [],
    },
  );
  const { projectinfo, errorProjectInfo, isLoadingProjectInfo } = useProjectMR(selectedProject);
  const members = projectinfo?.members || [];
  const labels = projectinfo?.labels || [];
  const mergeRequestTemplates = projectinfo?.mergeRequestTemplates || [];

  let project: Project | undefined;
  if (selectedProject) {
    project = projects?.find((pro) => pro.id.toString() === selectedProject);
  }
  const { milestoneInfo, errorMilestoneInfo, isLoadingMilestoneInfo } = useMilestones(project?.group_id);

  const isLoading = isLoadingProjects || isLoadingProjectInfo || isLoadingMilestoneInfo;
  const error = errorProjects || errorProjectInfo || errorMilestoneInfo;
  if (error) {
    showErrorToast(error, "Cannot create Merge Request");
  }

  const removeBranchFlagOrDefault = (val?: boolean) => {
    if (val !== undefined) {
      return val;
    }
    return project?.remove_source_branch_after_merge ?? true;
  };

  const [removeBranch, setRemoveBranch] = useState<boolean | undefined>(undefined);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>(NO_TEMPLATE);
  const [description, setDescription] = useState<string | undefined>(undefined);

  const { data: selectedTemplateDetail } = useCache<TemplateDetail | undefined>(
    `project_${project?.id}_selected_template_${selectedTemplateName}`,
    async () => {
      if (selectedTemplateName === NO_TEMPLATE) return undefined;
      return await gitlab.getProjectMergeRequestTemplate(project?.id || 0, selectedTemplateName);
    },
    { deps: [selectedTemplateName] },
  );

  useEffect(() => {
    setDescription(selectedTemplateDetail?.content ?? "");
  }, [selectedTemplateDetail]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Merge Request" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <ProjectDropdown
        projects={projects || []}
        setSelectedProject={(newValue) => {
          setRemoveBranch(undefined);
          setSelectedProject(newValue);
        }}
        value={selectedProject}
      />
      <SourceBranchDropdown project={project} info={projectinfo} value={props.branch} />
      <TargetBranchDropdown project={project} info={projectinfo} />
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.Dropdown id="template_id" title="Template" value={selectedTemplateName} onChange={setSelectedTemplateName}>
        <Form.Dropdown.Item key={NO_TEMPLATE} value={NO_TEMPLATE} title={"None"} />
        {mergeRequestTemplates.map((template) => (
          <Form.Dropdown.Item key={template.id} value={template.id} title={template.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter description"
        value={description}
        onChange={setDescription}
      />
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
      <Form.TagPicker id="reviewer_ids" title="Reviewers" placeholder="Type or choose a reviewer">
        {members.map((member) => (
          <Form.TagPicker.Item
            key={member.id.toString()}
            value={member.id.toString()}
            title={member.name || member.username}
            icon={{ source: member.avatar_url }}
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
        <Form.Dropdown.Item key={"no_milestone"} value={""} title={"-"} />
        {projectinfo?.milestones?.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.id.toString()} title={m.title} />
        ))}
        {milestoneInfo?.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.id.toString()} title={m.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="remove_source_branch"
        label="Delete source branch when merge request is accepted"
        value={removeBranchFlagOrDefault(removeBranch)}
        onChange={setRemoveBranch}
      />
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

function SourceBranchDropdown(props: {
  project?: Project | undefined;
  info?: ProjectInfoMR | undefined;
  value?: string | undefined;
}) {
  if (props.project && props.info) {
    const branches = props.info.branches.filter((b) => b.name !== "main");
    let value = undefined;
    if (props.value && branches.find((b) => b.name === props.value)) {
      value = props.value;
    } else {
      value = branches.length > 0 ? branches[0].name : "";
    }
    return (
      <Form.Dropdown id="source_branch" title="Source Branch" defaultValue={value}>
        {branches.map((branch) => (
          <Form.Dropdown.Item key={branch.name} value={branch.name} title={branch.name} />
        ))}
      </Form.Dropdown>
    );
  } else {
    return (
      <Form.Dropdown id="source_branch" title="Source Branch">
        <Form.Dropdown.Item key="_empty" value="" title="-" />
      </Form.Dropdown>
    );
  }
}

function TargetBranchDropdown(props: {
  project?: Project | undefined;
  info?: Pick<ProjectInfoMR, "branches"> | undefined;
}) {
  if (props.project && props.info) {
    const pro = props.project;
    const defaultBranch =
      pro.default_branch && pro.default_branch.length > 0 ? props.project.default_branch : undefined;
    return (
      <Form.Dropdown id="target_branch" title="Target branch" defaultValue={defaultBranch}>
        {props.info?.branches.map((branch) => (
          <Form.Dropdown.Item key={branch.name} value={branch.name} title={branch.name} />
        ))}
      </Form.Dropdown>
    );
  } else {
    return <Form.Dropdown id="target_branch" title="Target branch" />;
  }
}

function ProjectDropdownItem(props: { project: Project }) {
  const pro = props.project;
  return <Form.Dropdown.Item value={pro.id.toString()} title={pro.name_with_namespace} icon={projectIcon(pro)} />;
}
