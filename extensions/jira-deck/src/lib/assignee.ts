import { showToast, Toast } from "@raycast/api";
import { Issue, User } from "./issue";
import { assignIssue } from "./source";

// Issues with an assignee change on the way, so a repeated shortcut doesn't send it twice.
const pending = new Set<string>();

/** Returns whether Jira took the change. Undefined unassigns the issue. */
export async function changeAssignee(issue: Issue, user?: User): Promise<boolean> {
  if (issue.assignee?.accountId === user?.accountId || pending.has(issue.id)) return false;
  pending.add(issue.id);

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: user ? `Assigning ${issue.key} to ${user.displayName}` : `Unassigning ${issue.key}`,
  });
  try {
    await assignIssue(issue, user);
    toast.style = Toast.Style.Success;
    toast.title = user ? `Assigned ${issue.key} to ${user.displayName}` : `Unassigned ${issue.key}`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't change the assignee of ${issue.key}`;
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  } finally {
    pending.delete(issue.id);
  }
}
