import { Action, Color } from "@raycast/api";
import { MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { MRDetail } from "./mr";

export function ShowReviewMRAction(props: { mr: MergeRequest }) {
  const mr = props.mr;
  return (
    <Action.Push
      title="Open Merge Request"
      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
      target={<MRDetail mr={mr} />}
    />
  );
}
