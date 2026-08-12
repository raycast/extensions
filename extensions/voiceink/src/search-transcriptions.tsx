import { useState } from "react";
import { Action, ActionPanel, List, Icon, openExtensionPreferences } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { getDatabaseInfo, buildQuery, normalizeTranscriptions } from "./lib/database";
import type { Transcription } from "./lib/types";
import { TranscriptionItem } from "./components/TranscriptionItem";

const DISPLAY_LIMIT = 100;

export default function SearchTranscriptions() {
  const [searchText, setSearchText] = useState("");
  const dbInfo = getDatabaseInfo();

  const query = buildQuery(DISPLAY_LIMIT, searchText || undefined, dbInfo.source);
  const queryDatabasePath = dbInfo.available ? dbInfo.path : "/dev/null";

  const { isLoading, data, error, permissionView } = useSQL<Transcription>(queryDatabasePath, query, {
    execute: dbInfo.available,
    permissionPriming: "VoiceInk stores your transcription history in a local database.",
    failureToastOptions: {
      title: "Failed to load transcriptions",
    },
  });

  if (permissionView) {
    return permissionView;
  }

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

  const transcriptions = normalizeTranscriptions(data || []);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transcriptions..."
      throttle
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to Read Transcriptions" description={error.message} />
      ) : transcriptions.length === 0 && !isLoading ? (
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
