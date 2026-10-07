import { withAccessToken } from "@raycast/utils";
import { bucketOf, dueLabel, isMine, localDate, personName } from "../vendor/twelfth-shared/index";
import { authorize, signedInEmail } from "../lib/auth";
import { appUrl } from "../lib/config";
import { workspaceContext } from "../lib/context";
import { listOpenActions } from "../lib/twelfth";

type Input = {
  /**
   * "mine" for actions assigned to the user or to nobody (the default), "all" for everyone's.
   */
  whose?: "mine" | "all";
};

async function tool(input: Input) {
  const [context, actions, email] = await Promise.all([workspaceContext(), listOpenActions(), signedInEmail()]);
  const timeZone = context.timeZone;
  const now = new Date();
  return {
    workspace: context.workspace?.name,
    timezone: timeZone,
    today: localDate(now, timeZone),
    weekStartsOn: context.firstDayOfWeek,
    actions: actions
      .filter((action) => input.whose === "all" || isMine(action, email))
      .map((action) => ({
        title: action.title,
        details: action.details,
        due: dueLabel(action, timeZone, now) ?? "No due date",
        dueAt: action.dueAt,
        bucket: bucketOf(action, timeZone, now, context.firstDayOfWeek),
        assignee: personName(action.assigneeName, context.nameFormat) ?? "Unassigned",
        from: action.sourceTitle,
        context: action.sourceSummary,
        url: appUrl(`/app/tasks/${encodeURIComponent(action.id)}`),
      })),
  };
}

export default withAccessToken({ authorize })(tool);
