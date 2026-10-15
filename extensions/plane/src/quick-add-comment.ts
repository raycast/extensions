import { LaunchProps, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { plane, planeClient, requirePlaneClient } from "./api/auth";
import { getWorkItemByIdentifier } from "./api/work-items";
import { addWorkItemComment } from "./api/comments";
import { checkReferenceWorkspace, parseWorkItemIdentifier } from "./helpers/identifiers";
import { getWorkItemUrlWithIdentifier } from "./helpers/work-items";
import { showNoViewFailure, showWorkItemSuccess } from "./helpers/no-view";

async function command(props: LaunchProps<{ arguments: Arguments.QuickAddComment }>) {
  const { identifier: rawIdentifier, comment } = props.arguments;
  const parsed = parseWorkItemIdentifier(rawIdentifier);
  if (!parsed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid work item ID",
      message: `Use an ID such as ENG-123 (got "${rawIdentifier}")`,
    });
    return;
  }
  // A browse URL from another workspace would otherwise comment on the same ID in the current one.
  const problem = checkReferenceWorkspace(parsed, planeClient?.workspaceSlug);
  if (problem) {
    await showToast({ style: Toast.Style.Failure, title: "Can't use this link", message: problem });
    return;
  }
  const identifier = `${parsed.projectIdentifier}-${parsed.sequenceId}`;
  const toast = await showToast({ style: Toast.Style.Animated, title: `Adding comment to ${identifier}` });

  try {
    const client = requirePlaneClient();
    const workItem = await getWorkItemByIdentifier(parsed.projectIdentifier, parsed.sequenceId);
    if (!workItem.id || !workItem.project) throw new Error(`${identifier} not found`);
    await addWorkItemComment({ projectId: workItem.project, workItemId: workItem.id, markdown: comment });
    await showWorkItemSuccess(
      toast,
      `Comment added to ${identifier}`,
      identifier,
      getWorkItemUrlWithIdentifier(client.workspaceSlug, identifier),
    );
  } catch (error) {
    await toast.hide();
    await showNoViewFailure(`Failed to comment on ${identifier}`, error);
  }
}

export default withAccessToken(plane)(command);
