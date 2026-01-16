import { Action, ActionPanel, List, showToast, Toast, Icon, openExtensionPreferences } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getDatabaseInfo, buildQuery, parseTranscriptions } from "./lib/database";
import { TranscriptionItem } from "./components/TranscriptionItem";

const LIMIT = 50;

export default function RecentTranscriptions() {
  const dbInfo = getDatabaseInfo();

  const { isLoading, data } = useExec("sqlite3", ["-json", "-readonly", dbInfo.path, buildQuery(LIMIT)], {
    execute: dbInfo.available,
    parseOutput: ({ stdout }) => parseTranscriptions(stdout),
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load transcriptions",
        message: error.message,
      });
    },
  });

  if (!dbInfo.available) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="VoiceInk Database Not Found"
          description="Make sure VoiceInk is installed and has created at least one transcription. You can also configure a custom path in extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const transcriptions = data || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter transcriptions...">
      {transcriptions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Transcriptions"
          description="Your VoiceInk transcription history is empty."
        />
      ) : (
        <List.Section title="Recent" subtitle={`${transcriptions.length} transcriptions`}>
          {transcriptions.map((transcription) => (
            <TranscriptionItem key={transcription.id} transcription={transcription} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
