import { withAccessToken } from "@raycast/utils";
import { bucketOf, dueLabel, isMine, localDate } from "../lib/agenda";
import { authorize, signedInEmail } from "../lib/auth";
import { appUrl } from "../lib/config";
import { getWorkspace, listOpenActions } from "../lib/twelfth";

type Input = {
  /**
   * "mine" for actions assigned to the user or to nobody (the default), "all" for everyone's.
   */
  whose?: "mine" | "all";
};

async function tool(input: Input) {
  const [workspace, actions, email] = await Promise.all([getWorkspace(), listOpenActions(), signedInEmail()]);
  const timeZone = workspace?.timezone;
  const now = new Date();
  return {
    workspace: workspace?.name,
    timezone: timeZone,
    today: localDate(now, timeZone),
    actions: actions
      .filter((action) => input.whose === "all" || isMine(action, email))
      .map((action) => ({
        title: action.title,
        details: action.details,
        due: dueLabel(action, timeZone, now) ?? "No due date",
        dueAt: action.dueAt,
        bucket: bucketOf(action, timeZone, now),
        assignee: action.assigneeName ?? "Unassigned",
        from: action.sourceTitle,
        context: action.sourceSummary,
        url: appUrl(`/app/tasks/${encodeURIComponent(action.id)}`),
      })),
  };
}

export default withAccessToken({ authorize })(tool);
