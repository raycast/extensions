import { Color } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Note, Tag } from "./api";
import { isDailyJot } from "./amplenote";

export const ALL = "all";
export const UNTAGGED = "untagged";
export const ARCHIVED = "archived";
export const DAILY_JOTS = "daily-jots";
export const NO_DAILY_JOTS = "no-daily-jots";

export function tagFilterValue(tag: string): string {
  return `tag:${tag}`;
}

export function hasTag(noteTags: string[], tag: string): boolean {
  return noteTags.some((noteTag) => noteTag === tag || noteTag.startsWith(`${tag}/`));
}

export function matchesTagFilter(noteTags: string[], filter: string): boolean {
  if (filter === ALL) return true;
  if (filter === UNTAGGED) return noteTags.length === 0;
  return hasTag(noteTags, filter.slice("tag:".length));
}

export function filterNotesByTag(notes: Note[], filter: string): Note[] {
  if (filter === ARCHIVED) return notes.filter((note) => note.archived);
  if (filter === DAILY_JOTS) return notes.filter(isDailyJot);
  if (filter === NO_DAILY_JOTS) return notes.filter((note) => !note.archived && !isDailyJot(note));
  return notes.filter((note) => !note.archived && matchesTagFilter(note.tags, filter));
}

export function tagColor(tag: string, tags: Tag[] | undefined): Color.ColorLike {
  const color = tags?.find((item) => item.text === tag)?.color;
  return color ? `#${color}` : Color.Blue;
}

export function useHighlightedTags() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("highlighted-tags", []);
  const highlighted = value ?? [];

  const toggle = async (tag: string) => {
    await setValue(highlighted.includes(tag) ? highlighted.filter((item) => item !== tag) : [...highlighted, tag]);
  };

  const isHighlighted = (tag: string) => highlighted.some((item) => tag === item || tag.startsWith(`${item}/`));

  return { highlighted, isHighlighted, toggle, isLoading };
}
