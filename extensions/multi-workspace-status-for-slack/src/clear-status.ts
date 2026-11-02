import { Toast, showToast } from "@raycast/api";
import { clearStatus, summarize } from "./lib/slack";
import { loadLastForm, loadWorkspaces } from "./lib/storage";

export default async function Command() {
  const [workspaces, last] = await Promise.all([loadWorkspaces(), loadLastForm()]);
  const selected = last ? workspaces.filter((workspace) => last.teamIds.includes(workspace.teamId)) : workspaces;
  const targets = selected.length > 0 ? selected : workspaces;
  if (targets.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No workspaces connected yet" });
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
}
