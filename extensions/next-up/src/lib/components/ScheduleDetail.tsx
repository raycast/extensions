import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { ScheduleOccurrence, formatTime } from "../schedule-utils";
import { openLink, emailProfessor } from "../utils";

interface ScheduleDetailProps {
  occurrence: ScheduleOccurrence;
}

export function ScheduleDetail({ occurrence }: ScheduleDetailProps) {
  const { course, slot } = occurrence;

  const handleEmailProfessorAction = async () => {
    if (course.professor?.email) {
      await emailProfessor(course.professor.email);
    }
  };

  // Build markdown content
  let markdown = `# ${course.title}\n\n`;

  if (course.courseCode) {
    markdown += `**Course Code:** ${course.courseCode}\n\n`;
  }

  if (course.units !== undefined) {
    markdown += `**Units:** ${course.units}\n\n`;
  }

  // Schedule section
  markdown += `## Schedule\n\n`;
  markdown += `**Days:** ${slot.days.join(", ")}\n\n`;
  markdown += `**Time:** ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}\n\n`;

  if (slot.room) {
    markdown += `**Room:** ${slot.room}\n\n`;
  }

  if (slot.meetingLink) {
    markdown += `**Meeting Link:** [Join Meeting](${slot.meetingLink})\n\n`;
  }

  // Professor section
  if (course.professor) {
    markdown += `## Professor\n\n`;
    markdown += `**Name:** ${course.professor.name}\n\n`;
    if (course.professor.email) {
      markdown += `**Email:** [${course.professor.email}](mailto:${course.professor.email})\n\n`;
    }
  }

  // Links section
  const links: string[] = [];
  if (course.classLink) {
    links.push(`- [Class Link](${course.classLink})`);
  }
  if (course.extraLink) {
    links.push(`- [Extra Link](${course.extraLink})`);
  }

  if (links.length > 0) {
    markdown += `## Links\n\n${links.join("\n")}\n\n`;
  }

  // Ephemeral badge
  const ephemeralBadge = course.ephemeral ? { text: "Ephemeral", color: Color.Yellow } : undefined;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={course.title}
      metadata={
        <Detail.Metadata>
          {course.courseCode && <Detail.Metadata.Label title="Course Code" text={course.courseCode} />}
          {course.units !== undefined && <Detail.Metadata.Label title="Units" text={String(course.units)} />}
          <Detail.Metadata.Label title="Days" text={slot.days.join(", ")} />
          <Detail.Metadata.Label title="Time" text={`${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`} />
          {slot.room && <Detail.Metadata.Label title="Room" text={slot.room} />}
          {course.professor && <Detail.Metadata.Label title="Professor" text={course.professor.name} />}
          {ephemeralBadge && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={ephemeralBadge.text} color={ephemeralBadge.color} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {slot.meetingLink && (
              <Action
                title="Open Meeting Link"
                icon={Icon.Video}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => openLink(slot.meetingLink!)}
              />
            )}
            {course.classLink && (
              <Action title="Open Class Link" icon={Icon.Link} onAction={() => openLink(course.classLink!)} />
            )}
            {course.professor?.email && (
              <Action title="Email Professor" icon={Icon.Envelope} onAction={handleEmailProfessorAction} />
            )}
            {course.extraLink && (
              <Action title="Open Extra Link" icon={Icon.Globe} onAction={() => openLink(course.extraLink!)} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
