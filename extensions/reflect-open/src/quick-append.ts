import { getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { captureToDailyNote } from "./lib/reflect";

export default async function QuickAppend(props: LaunchProps<{ arguments: Arguments.QuickAppend }>) {
  const preferences = getPreferenceValues<Preferences.QuickAppend>();
  const text = props.arguments.text?.trim() || props.fallbackText?.trim() || "";

  const ok = await captureToDailyNote(text, {
    isTask: preferences.isTask,
    prependTimestamp: preferences.prependTimestamp,
    timestampFormat: preferences.timestampFormat,
  });

  if (ok) {
    await showHUD(preferences.isTask ? "Task captured for today" : "Captured for today");
  }
}
