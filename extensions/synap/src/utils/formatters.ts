import { Color, Icon } from "@raycast/api";

// Map profileSlug → Raycast icon + color
export const ENTITY_ICON: Record<string, { icon: Icon; tintColor: Color }> = {
  note: { icon: Icon.Document, tintColor: Color.SecondaryText },
  task: { icon: Icon.CheckCircle, tintColor: Color.Blue },
  project: { icon: Icon.Folder, tintColor: Color.Purple },
  event: { icon: Icon.Calendar, tintColor: Color.Green },
  person: { icon: Icon.Person, tintColor: Color.Yellow },
  contact: { icon: Icon.PersonCircle, tintColor: Color.Blue },
  company: { icon: Icon.Building, tintColor: Color.Orange },
  deal: { icon: Icon.BullsEye, tintColor: Color.Magenta },
  bookmark: { icon: Icon.Bookmark, tintColor: Color.Orange },
  website: { icon: Icon.Globe, tintColor: Color.Blue },
  article: { icon: Icon.BlankDocument, tintColor: Color.Purple },
  capture: { icon: Icon.Camera, tintColor: Color.Yellow },
  file: { icon: Icon.Paperclip, tintColor: Color.SecondaryText },
  memory: { icon: Icon.BulletPoints, tintColor: Color.SecondaryText },
  decision: { icon: Icon.Checkmark, tintColor: Color.Green },
  research: { icon: Icon.MagnifyingGlass, tintColor: Color.Blue },
  question: { icon: Icon.QuestionMark, tintColor: Color.Yellow },
};

export function entityIcon(profileSlug: string | null | undefined): { icon: Icon; tintColor: Color } {
  return (profileSlug ? ENTITY_ICON[profileSlug] : undefined) ?? { icon: Icon.Circle, tintColor: Color.SecondaryText };
}

const STATUS_COLOR: Record<string, Color> = {
  todo: Color.SecondaryText,
  "in-progress": Color.Blue,
  done: Color.Green,
  cancelled: Color.Red,
};

export function statusColor(status: string): Color {
  return STATUS_COLOR[status] ?? Color.SecondaryText;
}

const PRIORITY_ICON: Record<string, Icon> = {
  urgent: Icon.ExclamationMark,
  high: Icon.ArrowUp,
  medium: Icon.Minus,
  low: Icon.ArrowDown,
};

export function priorityIcon(priority: string): Icon {
  return PRIORITY_ICON[priority] ?? Icon.Minus;
}

export function relativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffMs < 0 && futureDays === 1) return "tomorrow";
  if (diffMs < 0 && futureDays < 7) return `in ${futureDays}d`;
  if (diffMs < 0 && futureDays < 30) return `in ${Math.ceil(futureDays / 7)}w`;
  if (diffMs < 0 && futureDays < 365) return `in ${Math.ceil(futureDays / 30)}mo`;
  if (diffMs < 0) return `in ${Math.ceil(futureDays / 365)}y`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function capitalize(str: string | null | undefined): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}
