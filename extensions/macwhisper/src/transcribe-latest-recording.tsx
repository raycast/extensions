import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { TranscriptionView } from "./components/TranscriptionView";
import { parseFolders, recentRecordings } from "./lib/files";

export default function Command() {
  const { recordingFolders } = getPreferenceValues<Preferences>();
  const folders = parseFolders(recordingFolders);
  const { data, isLoading } = usePromise(recentRecordings, [folders, 1]);

  if (isLoading || !data) return <Detail isLoading markdown="Looking for your latest recording…" />;

  if (data.length === 0) {
    return (
      <Detail
        markdown={`# No recording found\n\nNo audio or video file in:\n\n${folders.map((folder) => `- \`${folder}\``).join("\n")}\n\nChange the folders in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return <TranscriptionView paths={[data[0].path]} options={{}} />;
}
