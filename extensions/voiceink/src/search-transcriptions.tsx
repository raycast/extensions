import { useState } from "react";
import { Action, ActionPanel, List, showToast, Toast, Icon, openExtensionPreferences } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getDatabaseInfo, buildQuery, parseTranscriptions } from "./lib/database";
import { TranscriptionItem } from "./components/TranscriptionItem";

const DISPLAY_LIMIT = 100;

export default function SearchTranscriptions() {
  const [searchText, setSearchText] = useState("");
  const dbInfo = getDatabaseInfo();

  const query = buildQuery(DISPLAY_LIMIT, searchText || undefined);

  const { isLoading, data } = useExec("sqlite3", ["-json", "-readonly", dbInfo.path, query], {
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
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transcriptions..."
      throttle
    >
      {transcriptions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={searchText ? Icon.MagnifyingGlass : Icon.Message}
          title={searchText ? "No Results" : "No Transcriptions"}
          description={
            searchText ? `No transcriptions matching "${searchText}"` : "Your VoiceInk transcription history is empty."
          }
        />
      ) : (
        <List.Section
          title={searchText ? "Search Results" : "Recent"}
          subtitle={
            transcriptions.length >= DISPLAY_LIMIT ? `${DISPLAY_LIMIT}+ found` : `${transcriptions.length} found`
          }
        >
          {transcriptions.map((transcription) => (
            <TranscriptionItem key={transcription.id} transcription={transcription} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
