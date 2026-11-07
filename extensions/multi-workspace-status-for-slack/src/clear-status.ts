import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { clearStatus, clearTargets, summarize } from "./lib/slack";
import { loadLastForm, loadWorkspaces } from "./lib/storage";

export default async function Command() {
  try {
    const [workspaces, last] = await Promise.all([loadWorkspaces(), loadLastForm()]);
    if (workspaces.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No workspaces connected yet" });
      return;
    }
    const targets = clearTargets(workspaces, last?.teamIds);
    if (targets.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Your last selected workspaces are no longer connected",
        message: "Open Set Status to choose workspaces.",
      });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing status…" });
    const results = await clearStatus(targets);
    const failed = results.filter((result) => result.error);
    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Status cleared";
      toast.message = targets.map((workspace) => workspace.name).join(", ");
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `${failed.length} of ${results.length} workspaces failed`;
      toast.message = summarize(results);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not clear status" });
  }
}
