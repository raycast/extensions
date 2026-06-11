import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { ScheduleOccurrence, formatTime, resolveRaycastColor } from "../schedule-utils";
import { ScheduleDetail } from "./ScheduleDetail";
import { getIcon } from "../constants";
import { openLink, emailProfessor } from "../utils";

interface CourseListItemProps {
  occurrence: ScheduleOccurrence;
  onManage?: () => void;
}

export function CourseListItem({ occurrence, onManage }: CourseListItemProps) {
  const { push } = useNavigation();
  const { course, slot } = occurrence;

  const startTimeFormatted = formatTime(slot.startTime);
  const endTimeFormatted = formatTime(slot.endTime);
  const subtitle = `${startTimeFormatted} – ${endTimeFormatted}`;

  const accessories: List.Item.Accessory[] = [];

  if (slot.room) {
    accessories.push({ text: slot.room });
  }

  if (course.courseCode) {
    accessories.push({ tag: course.courseCode });
  }

  const iconColor = resolveRaycastColor(course.color);
  const resolvedIcon = getIcon(course.icon) ?? Icon.Book;
  const icon = { source: resolvedIcon, tintColor: iconColor };

  const handleEmailProfessorAction = async () => {
    if (course.professor?.email) {
      await emailProfessor(course.professor.email);
    }
  };

  return (
    <List.Item
      title={course.title}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Details"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => push(<ScheduleDetail occurrence={occurrence} />)}
            />
            {slot.meetingLink && (
              <Action
                title="Open Meeting Link"
                icon={Icon.Video}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => {
                  const meetingLink = slot.meetingLink;
                  if (meetingLink) {
                    openLink(meetingLink);
                  }
                }}
              />
            )}
            {course.classLink && (
              <Action
                title="Open Class Link"
                icon={Icon.Link}
                onAction={() => {
                  const classLink = course.classLink;
                  if (classLink) {
                    openLink(classLink);
                  }
                }}
              />
            )}
            {course.extraLink && (
              <Action
                title="Open Extra Link"
                icon={Icon.Globe}
                onAction={() => {
                  const extraLink = course.extraLink;
                  if (extraLink) {
                    openLink(extraLink);
                  }
                }}
              />
            )}
            {course.professor?.email && (
              <Action title="Email Professor" icon={Icon.Envelope} onAction={handleEmailProfessorAction} />
            )}
          </ActionPanel.Section>
          {onManage && (
            <ActionPanel.Section>
              <Action title="Manage Schedules" icon={Icon.List} onAction={onManage} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
