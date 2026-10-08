import { Color, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { addDays, format, isToday, isYesterday, startOfToday } from "date-fns";
import { Activity, BashOutput, Session, SessionState } from "./types";

export function getStatusIconForSession(session: Session) {
  let icon: List.Item.Props["icon"];

  switch (session.state) {
    case SessionState.IN_PROGRESS:
      icon = {
        value: { source: Icon.CircleEllipsis, tintColor: Color.Blue },
        tooltip: "Status: Running",
      };
      break;
    case SessionState.COMPLETED:
      icon = {
        value: { source: Icon.CheckCircle, tintColor: Color.Green },
        tooltip: "Status: Completed",
      };
      break;
    case SessionState.FAILED:
      icon = {
        value: { source: Icon.XMarkCircle, tintColor: Color.Red },
        tooltip: "Status: Failed",
      };
      break;
    case SessionState.PLANNING:
    case SessionState.QUEUED:
      icon = {
        value: { source: Icon.Circle, tintColor: Color.SecondaryText },
        tooltip: "Status: Planning/Queued",
      };
      break;
    case SessionState.AWAITING_PLAN_APPROVAL:
    case SessionState.AWAITING_USER_FEEDBACK:
      icon = {
        value: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
        tooltip: "Status: Needs Attention",
      };
      break;
    default:
      icon = {
        value: { source: Icon.CircleDisabled, tintColor: Color.PrimaryText },
        tooltip: "Status: Unknown",
      };
      break;
  }

  return icon;
}

export function getStatusIconSimpleForSession(session: Session) {
  switch (session.state) {
    case SessionState.IN_PROGRESS:
      return Icon.CircleEllipsis;
    case SessionState.COMPLETED:
      return Icon.CheckCircle;
    case SessionState.FAILED:
      return Icon.XMarkCircle;
    case SessionState.PLANNING:
    case SessionState.QUEUED:
      return Icon.Circle;
    case SessionState.AWAITING_PLAN_APPROVAL:
    case SessionState.AWAITING_USER_FEEDBACK:
      return Icon.ExclamationMark;
    default:
      return Icon.CircleDisabled;
  }
}

export function getSessionAccessories(
  session: Session,
  opts: {
    hideCreateTime?: boolean;
    hideStatus?: boolean;
  } = {},
) {
  const accessories: List.Item.Props["accessories"] = [];

  if (!opts.hideCreateTime && session.createTime) {
    const createTime = new Date(session.createTime);
    accessories.push({
      date: createTime,
      tooltip: `Created: ${format(createTime, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    });
  }

  return accessories;
}

export function groupSessions(sessions?: Session[]) {
  const groupedSessions = {
    today: new Array<Session>(),
    yesterday: new Array<Session>(),
    thisWeek: new Array<Session>(),
    thisMonth: new Array<Session>(),
    older: new Array<Session>(),
  };

  if (!sessions) {
    return groupedSessions;
  }

  const sevenDaysAgo = addDays(startOfToday(), -7);
  const thirtyDaysAgo = addDays(startOfToday(), -30);

  sessions.forEach((session) => {
    const createTime = new Date(session.createTime);
    if (isToday(createTime)) {
      groupedSessions.today.push(session);
    } else if (isYesterday(createTime)) {
      groupedSessions.yesterday.push(session);
    } else if (createTime >= sevenDaysAgo) {
      groupedSessions.thisWeek.push(session);
    } else if (createTime >= thirtyDaysAgo && createTime < sevenDaysAgo) {
      groupedSessions.thisMonth.push(session);
    } else {
      groupedSessions.older.push(session);
    }
  });

  return groupedSessions;
}

export function formatPrTitle(prUrl: string) {
  const pr = extractPR(prUrl);
  return pr ? `PR ${pr.number}` : prUrl;
}

export function formatPrSubtitle(prUrl: string) {
  const pr = extractPR(prUrl);
  return pr ? `${pr.owner}/${pr.name}` : undefined;
}

export function extractPR(prUrl: string) {
  try {
    const url = new URL(prUrl);
    const pathParts = url.pathname.split("/");

    if (url.hostname === "github.com" && pathParts.length >= 5 && pathParts[3] === "pull") {
      const owner = pathParts[1];
      const name = pathParts[2];
      const number = pathParts[4];
      return { number, owner, name };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
    });
  } catch {
    // Silently ignoring that the menu bar is not running
  }
}

export function formatRepoName(source?: string): string {
  if (!source) return "No Repository";
  if (source.startsWith("sources/github/")) {
    return source.replace("sources/github/", "");
  }
  return source;
}

export function formatSessionState(state: SessionState): string {
  switch (state) {
    case SessionState.STATE_UNSPECIFIED:
      return "Unspecified";
    case SessionState.QUEUED:
      return "Queued";
    case SessionState.PLANNING:
      return "Planning";
    case SessionState.AWAITING_PLAN_APPROVAL:
      return "Awaiting Plan Approval";
    case SessionState.AWAITING_USER_FEEDBACK:
      return "Awaiting User Feedback";
    case SessionState.IN_PROGRESS:
      return "In Progress";
    case SessionState.PAUSED:
      return "Paused";
    case SessionState.FAILED:
      return "Failed";
    case SessionState.COMPLETED:
      return "Completed";
    default:
      return state;
  }
}

export function formatSessionTitle(session: Session, maxLength = 50): string {
  const rawTitle = (session.title || session.id).split("\n")[0].trim();
  return rawTitle.length > maxLength ? rawTitle.substring(0, maxLength) + "..." : rawTitle;
}

export function getActivityTitle(activity: Activity): string {
  if (activity.userMessaged) return "User Message";
  if (activity.agentMessaged) return "Agent Message";
  if (activity.planGenerated) return "Plan Generated";
  if (activity.planApproved) return "Plan Approved";
  if (activity.progressUpdated) return activity.progressUpdated.title || "Progress Update";
  if (activity.sessionCompleted) return "Session Completed";
  if (activity.sessionFailed) return "Session Failed: " + (activity.sessionFailed.reason || "Unknown reason");
  return activity.description || "Activity";
}

export function getActivityMarkdown(
  activity: Activity,
  options: { includeFullArtifacts?: boolean } = { includeFullArtifacts: true },
): string {
  let content = "";
  if (activity.userMessaged) content = activity.userMessaged.userMessage || "";
  else if (activity.agentMessaged) content = activity.agentMessaged.agentMessage || "";
  else if (activity.planGenerated) {
    const plan = activity.planGenerated.plan;
    content = `**Plan with ${plan.steps.length} steps:**\n\n`;
    const stepsToShow = plan.steps.slice(0, 4);
    stepsToShow.forEach((step, i) => {
      content += `${i + 1}. ${step.title}\n`;
    });
    if (plan.steps.length > 4) {
      content += `\n_...and ${plan.steps.length - 4} more steps_`;
    }
  } else if (activity.progressUpdated) content = activity.progressUpdated.description || "";
  else if (activity.sessionFailed) content = activity.sessionFailed.reason || "";
  else content = activity.description || "";

  if (activity.artifacts && activity.artifacts.length > 0) {
    content += "\n\n### Artifacts\n";
    activity.artifacts.forEach((artifact) => {
      if (artifact.changeSet) {
        content += `\n**Change Set**: ${artifact.changeSet.source}\n`;
        if (artifact.changeSet.gitPatch?.unidiffPatch) {
          if (options.includeFullArtifacts) {
            content += "\n```diff\n" + artifact.changeSet.gitPatch.unidiffPatch + "\n```\n";
          } else {
            content += "\n_Git patch omitted_\n";
          }
        }
      }
      if (artifact.media) {
        if (options.includeFullArtifacts) {
          content += `\n![Media](data:${artifact.media.mimeType};base64,${artifact.media.data})\n`;
        } else {
          content += `\n_Media artifact (${artifact.media.mimeType}) omitted_\n`;
        }
      }
      if (artifact.bashOutput) {
        content += formatBashOutputMarkdown(artifact.bashOutput, {
          includeFullOutput: options.includeFullArtifacts,
        });
      }
    });
  }

  return content;
}

export function formatPlanToMarkdown(plan: import("./types").Plan): string {
  return plan.steps.map((s) => `${(s.index ?? 0) + 1}. **${s.title}**\n   ${s.description || ""}`).join("\n\n");
}

export function formatBashOutputMarkdown(
  bashOutput: BashOutput,
  options: { includeFullOutput?: boolean } = { includeFullOutput: true },
): string {
  const exitCode = bashOutput.exitCode;
  const isSuccess = exitCode === 0;

  let exitCodeDisplay = "";
  if (exitCode === undefined || exitCode === null) {
    exitCodeDisplay = "N/A";
  } else {
    exitCodeDisplay = `${exitCode} ${isSuccess ? "✅" : "❌"}`;
  }

  let markdown = `
**Command**: \`${bashOutput.command}\`

**Exit Code**: ${exitCodeDisplay}
`;

  if (options.includeFullOutput) {
    markdown += `
~~~bash
${bashOutput.output}
~~~
`;
  }

  return markdown;
}
