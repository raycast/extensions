import { getPreferenceValues } from "@raycast/api";

export type DetailLevel = "normal" | "reduced" | "minimal";

/** How much each row shows, from the "Information" preference. */
export function detailLevel(): DetailLevel {
  const { detailLevel } = getPreferenceValues<Preferences>();
  return detailLevel as DetailLevel;
}

/** Row subtitles such as the focused pane's title or the tab a pane belongs to. */
export function showsSubtitles(): boolean {
  return detailLevel() !== "minimal";
}

/** The "program · directory" accessory and the Program/Directory metadata rows. */
export function showsProgram(): boolean {
  return detailLevel() !== "minimal";
}

/** Tab, pane, and session counts. */
export function showsCounts(): boolean {
  return detailLevel() === "normal";
}

/** Host icons on rows and the Host metadata row. */
export function showsHost(): boolean {
  return detailLevel() === "normal";
}

/** Short IDs in the detail metadata. */
export function showsIds(): boolean {
  return detailLevel() === "normal";
}

/** Section subtitles such as "3 tabs · 5 panes". */
export function showsSectionSubtitles(): boolean {
  return detailLevel() !== "minimal";
}

/** Status as a tag with text; otherwise status is an icon-only accessory. */
export function showsStatusText(): boolean {
  return detailLevel() !== "minimal";
}
