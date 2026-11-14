import { Color, Icon } from "@raycast/api";
import { formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";
import { Attachment, Course, Status, StreamItem, StreamItemType, getStatus } from "../api/classroom";
import { withAuthUser } from "../api/googleAuth";

export function formatDateTime(date: Date): string {
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);

  if (isToday(date)) return `Today at ${time}`;
  if (isYesterday(date)) return `Yesterday at ${time}`;
  if (isTomorrow(date)) return `Tomorrow at ${time}`;

  const day = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
  return `${day} at ${time}`;
}

export const TYPE_INFO: Record<StreamItemType, { title: string; plural: string; icon: Icon }> = {
  announcement: { title: "Announcement", plural: "Announcements", icon: Icon.Megaphone },
  assignment: { title: "Assignment", plural: "Assignments", icon: Icon.Clipboard },
  question: { title: "Question", plural: "Questions", icon: Icon.QuestionMarkCircle },
  material: { title: "Material", plural: "Materials", icon: Icon.Book },
};

export const STATUS_INFO: Record<Status, { title: string; color: Color; icon: Icon }> = {
  assigned: { title: "Assigned", color: Color.Blue, icon: Icon.Circle },
  missing: { title: "Missing", color: Color.Red, icon: Icon.ExclamationMark },
  turnedIn: { title: "Turned In", color: Color.Green, icon: Icon.CheckCircle },
  returned: { title: "Returned", color: Color.Purple, icon: Icon.CheckRosette },
};

export function getStatusTitle(item: StreamItem): string {
  const { title } = STATUS_INFO[getStatus(item)];
  return item.submission?.late && item.submission.state === "TURNED_IN" ? `${title} Late` : title;
}

export function formatGrade(item: StreamItem): string | undefined {
  const grade = item.submission?.assignedGrade;
  if (grade !== undefined) return item.maxPoints ? `${grade} / ${item.maxPoints}` : String(grade);
  return item.maxPoints ? `${item.maxPoints} points` : undefined;
}

// e.g. "in 3 days" or "2 hours ago"
export function formatRelative(date: Date): string {
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

const ATTACHMENT_LABELS: Record<Attachment["kind"], string> = {
  drive: "Drive",
  youtube: "YouTube",
  link: "Link",
  form: "Form",
  gem: "Gemini Gem",
  notebook: "NotebookLM",
};

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

// For names and titles, which are plain text that Markdown would otherwise interpret
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#]/g, "\\$&");
}

// Drive files and forms open with the signed-in account rather than the browser's default one
export function getAttachmentUrl({ kind, url }: Attachment): string {
  return kind === "drive" || kind === "form" ? withAuthUser(url) : url;
}

function attachmentList(attachments: Attachment[], getUrl: (attachment: Attachment) => string): string {
  return attachments
    .map((attachment) => {
      const url = getUrl(attachment).replace(/[()\s]/g, (character) => `%${character.charCodeAt(0).toString(16)}`);
      return `- [${escapeMarkdown(attachment.title)}](${url}) (${ATTACHMENT_LABELS[attachment.kind]})`;
    })
    .join("\n");
}

// Body shown in the detail view, where `forAccount` makes the links open with the signed-in account.
// Left out when the body is copied or handed over, so that it doesn't carry the user's email around.
export function getItemBody(item: StreamItem, options?: { forAccount?: boolean }): string {
  const getUrl = options?.forAccount ? getAttachmentUrl : ({ url }: Attachment) => url;
  const sections = [item.text?.trim()];
  if (item.choices?.length) sections.push(item.choices.map((choice) => `- ${choice}`).join("\n"));
  if (item.attachments.length) sections.push(`### Attachments\n${attachmentList(item.attachments, getUrl)}`);

  const { submission } = item;
  if (submission?.shortAnswer) sections.push(`### Your Answer\n${submission.shortAnswer}`);
  if (submission?.attachments.length) {
    sections.push(`### Your Work\n${attachmentList(submission.attachments, getUrl)}`);
  }

  return sections.filter(Boolean).join("\n\n");
}

// Everything about an item as Markdown, to copy or to hand over to AI
export function getItemDetails(item: StreamItem, course: Course, topic?: string): string {
  const isCourseWork = item.type === "assignment" || item.type === "question";
  const fields = [
    `Course: ${course.name}${course.section ? ` (${course.section})` : ""}`,
    `Type: ${TYPE_INFO[item.type].title}`,
    topic && `Topic: ${topic}`,
    isCourseWork && `Due: ${item.dueDate ? formatDateTime(new Date(item.dueDate)) : "No due date"}`,
    isCourseWork && `Status: ${getStatusTitle(item)}`,
    formatGrade(item) && `${item.submission?.assignedGrade !== undefined ? "Grade" : "Points"}: ${formatGrade(item)}`,
    `Posted: ${formatDateTime(new Date(item.creationTime))}`,
    `Link: ${item.url}`,
  ];

  return `# ${item.title}\n\n${fields.filter(Boolean).join("\n")}\n\n${getItemBody(item)}`.trim();
}

// The teachers are listed in the metadata of the detail view
export function getCourseMarkdown(course: Course): string {
  const sections = [`# ${escapeMarkdown(course.name)}`, course.section && `**${escapeMarkdown(course.section)}**`];

  if (course.descriptionHeading && course.descriptionHeading !== course.name) {
    sections.push(`## ${escapeMarkdown(course.descriptionHeading)}`);
  }
  sections.push(course.description?.trim());

  return sections.filter(Boolean).join("\n\n");
}

// Tells apart having nothing, having nothing that matches, and having failed to load
export function getEmptyTitle(plural: string, state: { error?: Error; isFiltered: boolean }): string {
  if (state.error) return `Couldn't Load ${plural}`;
  return state.isFiltered ? `No Matching ${plural}` : `No ${plural}`;
}
