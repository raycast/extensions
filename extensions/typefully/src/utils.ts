import { Color, Keyboard } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Draft } from "./types";

dayjs.extend(relativeTime);

export function getRelativeDate(draft: Draft) {
  if (draft.published_on) {
    return dayjs().to(draft.published_on);
  } else if (draft.scheduled_date) {
    return dayjs().to(draft.scheduled_date);
  } else {
    return undefined;
  }
}

export function getTypefullyIcon(tinted = false) {
  const overrideTintColor = tinted ? Color.Blue : undefined;
  return {
    source: "black-feather.svg",
    tintColor: overrideTintColor ? overrideTintColor : { light: "#000000", dark: "#FFFFFF" },
  };
}

export function getMenuBarExtraItemTitle(draft: Draft) {
  const firstLine = draft.text_first_tweet.split("\n")[0];
  if (!firstLine) {
    return "Untitled draft";
  }

  return firstLine.slice(0, 50);
}

export function getMenuBarExtraItemShortcut(index: number, modifiers: Keyboard.KeyModifier[] = ["cmd"]) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers, key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

export function sortByScheduled(a: Draft, b: Draft) {
  return new Date(a.scheduled_date ?? "").getTime() - new Date(b.scheduled_date ?? "").getTime();
}

export function sortByPublished(a: Draft, b: Draft) {
  return new Date(b.published_on ?? "").getTime() - new Date(a.published_on ?? "").getTime();
}
