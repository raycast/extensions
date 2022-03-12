import { Color, PushAction } from "@raycast/api";
import { MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { MRDetail } from "./mr";

export function ShowReviewMRAction(props: { mr: MergeRequest }): JSX.Element {
  const mr = props.mr;
  return (
    <PushAction
      title="Open Merge Request"
      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
      target={<MRDetail mr={mr} />}
    />
  );
}
