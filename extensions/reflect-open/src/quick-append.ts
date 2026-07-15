import { getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { captureToDailyNote, TimestampFormat } from "./lib/reflect";

interface Preferences {
  isTask: boolean;
  prependTimestamp: boolean;
  timestampFormat: TimestampFormat;
}

interface QuickAppendArguments {
  text?: string;
}

export default async function QuickAppend(props: LaunchProps<{ arguments: QuickAppendArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
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
