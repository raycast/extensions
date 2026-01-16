import { Color, Icon, Action } from "@raycast/api";
import { Branch, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { ProjectCommitList } from "./commits/list";
import { MRCreateForm } from "./mr_create";

export function CreateMRAction(props: { project: Project; branch: Branch }) {
  if (props.project.default_branch !== props.branch.name) {
    return (
      <Action.Push
        icon={Icon.Pencil}
        title="Create Merge Request"
        target={<MRCreateForm project={props.project} branch={props.branch.name} />}
      />
    );
  } else {
    return null;
  }
}

export function ShowBranchCommitsAction(props: { projectID: number; branch: Branch }) {
  return (
    <Action.Push
      title="Show Commits"
      icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
      target={<ProjectCommitList projectID={props.projectID} refName={props.branch.name} />}
    />
  );
}
