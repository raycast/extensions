import { Icon, PushAction } from "@raycast/api";
import { Branch, Project } from "../gitlabapi";
import { MRCreateForm } from "./mr_create";

export function CreateMRAction(props: { project: Project; branch: Branch }) {
  if (props.project.default_branch !== props.branch.name) {
    return (
      <PushAction
        icon={Icon.Pencil}
        title="Create Merge Request"
        target={<MRCreateForm project={props.project} branch={props.branch.name} />}
      />
    );
  } else {
    return null;
  }
}
