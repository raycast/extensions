import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { TimeEntry } from "../api/time";
import { TeamUser } from "../api/users";
import { formatDuration } from "../helpers/time";
import { formatDayLabel } from "../helpers/dates";

type Props = {
  entry: TimeEntry;
  user?: TeamUser;
  projectMap: Map<string, string>;
};

export default function TimeEntryDetail({ entry, user, projectMap }: Props) {
  const taskName = entry.task?.name || "No Task";
  const projectName = entry.task?.projects?.[0]
    ? projectMap.get(entry.task.projects[0]) || entry.task.projects[0]
    : "";
  const comment = entry.comment;
  const estimate = entry.task?.estimate?.total;
  const totalTracked = entry.task?.time?.total;

  const parts = [`# ${taskName}`];
  if (projectName) parts.push(`**Project:** ${projectName}`);
  if (estimate) {
    const ratio = (totalTracked ?? 0) / estimate;
    const status = ratio >= 1.0 ? "🚫" : ratio >= 0.8 ? "⚠️" : "✅";
    parts.push(
      `**Budget:** ${formatDuration(totalTracked ?? 0)} / ${formatDuration(estimate)} ${status}`,
    );
  }
  parts.push("");
  parts.push(comment ? `> ${comment}` : "_No comment_");

  return (
    <Detail
      navigationTitle={taskName}
      markdown={parts.join("\n\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(entry.time)}
            icon={Icon.Clock}
          />
          <Detail.Metadata.Label
            title="Date"
            text={formatDayLabel(entry.date)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Separator />
          {user && (
            <Detail.Metadata.Label
              title="Team Member"
              text={user.name}
              icon={getAvatarIcon(user.name)}
            />
          )}
          {projectName && (
            <Detail.Metadata.Label
              title="Project"
              text={projectName}
              icon={Icon.Folder}
            />
          )}
          <Detail.Metadata.Label
            title="Task"
            text={taskName}
            icon={Icon.Document}
          />
          {estimate && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Budget"
                text={`${formatDuration(totalTracked ?? 0)} / ${formatDuration(estimate)}`}
                icon={Icon.BarChart}
              />
            </>
          )}
          {comment && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Comment"
                text={comment}
                icon={Icon.Bubble}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {entry.task?.url && (
            <Action.OpenInBrowser title="Open Task" url={entry.task.url} />
          )}
        </ActionPanel>
      }
    />
  );
}
