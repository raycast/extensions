import { Clipboard, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { startThread } from "./lib/amp";
import { openInAmp, withToast } from "./lib/ui";

export default async function StartThread(props: LaunchProps<{ arguments: Arguments.StartThread }>) {
  const prefs = getPreferenceValues<Preferences>();
  const project = props.arguments.project?.trim() || prefs.defaultProject?.trim() || undefined;
  const url = await withToast(
    "Starting orb…",
    () => startThread({ prompt: props.arguments.prompt, project, mode: prefs.defaultMode }),
    "Thread started",
  );
  if (!url) return;
  await Clipboard.copy(url);
  await openInAmp(url);
  await showHUD("Amp thread started — URL copied");
}
