import { Color, Icon, List } from "@raycast/api";
import { memo } from "react";
import { serviceName } from "../lib/open-integration";
import { escapeMarkdown } from "../lib/notes";
import { elapsedSeconds, formatDuration, formatElapsed } from "../lib/time";
import { Task } from "../lib/types";

interface Props {
  task: Task;
  /**
   * Current time, ticked by the parent while a timer runs. Pass 0 for rows
   * without a running timer so they don't re-render on every tick.
   */
  now: number;
  /** Web link to the task, when the workspace is known. */
  sunsamaUrl?: string;
}

/**
 * An ISO timestamp in the user's locale, e.g. "9/21/2026, 8:50:45 AM";
 * undefined when absent or unparsable, so the row is left out rather than
 * reading "Invalid Date".
 */
function formatDate(iso?: string): string | undefined {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? undefined : new Date(time).toLocaleString();
}

/**
 * Side pane for a task: notes and subtasks as Markdown, everything else as
 * metadata. Memoized because the list re-renders every second while a timer
 * runs and each row carries one of these.
 */
export const TaskDetail = memo(function TaskDetail({
  task,
  now,
  sunsamaUrl,
}: Props) {
  const { Metadata } = List.Item.Detail;

  // Tracked total plus the live session, matching the row accessory.
  const tracked =
    task.trackedSeconds +
    (task.isRunning ? elapsedSeconds(task.timerStart, now) : 0);

  // Title, notes, then subtasks as a checklist — only when there are any.
  // Titles are user text, so they're escaped; notes are already Markdown.
  const sections: string[] = [
    `# ${escapeMarkdown(task.title)}`,
    task.notes ?? "_No notes_",
  ];
  if (task.subtasks.length > 0) {
    const checklist = task.subtasks
      .map((s) => `- [${s.completed ? "x" : " "}] ${escapeMarkdown(s.title)}`)
      .join("\n");
    sections.push(`## Subtasks\n\n${checklist}`);
  }
  const markdown = sections.join("\n\n");

  // Unmapped services fall back to Sunsama's raw key: a name beats nothing here,
  // unlike the "Open in …" action label, which keeps its generic wording.
  const integration =
    serviceName(task.integrationService) ?? task.integrationService;
  const source = serviceName(task.importedFrom) ?? task.importedFrom;
  const hasLinks = Boolean(
    sunsamaUrl ||
    integration ||
    task.integrationId ||
    task.integrationAccount ||
    source,
  );
  const created = formatDate(task.createdAt);
  const modified = formatDate(task.lastModified);
  const hasTimestamps = Boolean(created || modified);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <Metadata>
          {/* Planning */}
          {task.channelName && (
            <Metadata.TagList title="Channel">
              <Metadata.TagList.Item
                text={task.channelName}
                color={Color.SecondaryText}
              />
            </Metadata.TagList>
          )}
          {task.category && (
            <Metadata.Label title="Category" text={task.category} />
          )}
          {task.timeEstimate !== undefined && task.timeEstimate > 0 && (
            <Metadata.Label
              title="Planned"
              icon={Icon.Clock}
              text={formatDuration(task.timeEstimate)}
            />
          )}
          {(tracked > 0 || task.isRunning) && (
            <Metadata.Label
              title="Tracked"
              icon={{
                source: Icon.Stopwatch,
                tintColor: task.isRunning ? Color.Green : Color.SecondaryText,
              }}
              text={{
                value: formatElapsed(tracked),
                color: task.isRunning ? Color.Green : Color.PrimaryText,
              }}
            />
          )}
          {task.timeSlots.length > 0 && (
            <Metadata.TagList title="Scheduled">
              {/* Positional keys: two slots can legitimately read the same. */}
              {task.timeSlots.map((slot, index) => (
                <Metadata.TagList.Item key={index} text={slot} />
              ))}
            </Metadata.TagList>
          )}

          {/* Links */}
          {hasLinks && <Metadata.Separator />}
          {sunsamaUrl && (
            <Metadata.Link
              title="Sunsama"
              text="Open task"
              target={sunsamaUrl}
            />
          )}
          {integration && task.integrationUrl && (
            <Metadata.Link
              title="Linked To"
              text={integration}
              target={task.integrationUrl}
            />
          )}
          {integration && !task.integrationUrl && (
            <Metadata.Label title="Linked To" text={integration} />
          )}
          {task.integrationId && (
            <Metadata.Label title="Item ID" text={task.integrationId} />
          )}
          {task.integrationAccount && (
            <Metadata.Label title="Account" text={task.integrationAccount} />
          )}
          {source && <Metadata.Label title="Imported From" text={source} />}

          {/* Timestamps */}
          {hasTimestamps && <Metadata.Separator />}
          {created && <Metadata.Label title="Created" text={created} />}
          {modified && <Metadata.Label title="Modified" text={modified} />}
        </Metadata>
      }
    />
  );
});
