import { getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { journalSheetText, journalSheetUrl } from "./ulysses-url";
import { openUlyssesCallback } from "./utils";

export default async function CreateJournalEntry(props: LaunchProps<{ arguments: Arguments.CreateJournalEntry }>) {
  const preferences = getPreferenceValues<Preferences.CreateJournalEntry>();
  const group = preferences.journalGroup.trim() || "Journal";
  const background = !preferences.showInUlysses;
  const url = journalSheetUrl({
    text: journalSheetText({ now: new Date(), entry: props.arguments.entry }),
    group,
    silent: background,
  });
  if (await openUlyssesCallback(url, { background })) {
    await showHUD(`Added today's sheet to ${group}`);
  }
}
