import { useState } from "react";
import { Action, ActionPanel, List, Icon, openExtensionPreferences } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { getDatabaseInfo, buildQuery, normalizeTranscriptions, SCHEMA_QUERY } from "./lib/database";
import type { SchemaColumn } from "./lib/database";
import type { Transcription } from "./lib/types";
import { TranscriptionItem } from "./components/TranscriptionItem";

const DISPLAY_LIMIT = 100;
const PERMISSION_PRIMING = "VoiceInk stores your transcription history in a local database.";

export default function SearchTranscriptions() {
  const [searchText, setSearchText] = useState("");
  const dbInfo = getDatabaseInfo();

  const queryDatabasePath = dbInfo.available ? dbInfo.path : "/dev/null";

  // VoiceInk renames columns between versions, so read the schema first and
  // only ask for columns this database has.
  const {
    isLoading: isLoadingSchema,
    data: schemaColumns,
    error: schemaError,
    permissionView: schemaPermissionView,
  } = useSQL<SchemaColumn>(queryDatabasePath, SCHEMA_QUERY, {
    execute: dbInfo.available,
    permissionPriming: PERMISSION_PRIMING,
    failureToastOptions: {
      title: "Failed to read the transcriptions database",
    },
  });

  const columns = schemaColumns?.map((column) => column.name);
  const query = buildQuery(DISPLAY_LIMIT, searchText || undefined, columns ?? []);

  const { isLoading, data, error, permissionView } = useSQL<Transcription>(queryDatabasePath, query, {
    execute: dbInfo.available && columns !== undefined,
    permissionPriming: PERMISSION_PRIMING,
    failureToastOptions: {
      title: "Failed to load transcriptions",
    },
  });

  if (schemaPermissionView) {
    return schemaPermissionView;
  }

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
  const loadError = schemaError ?? error;
  const isLoadingAny = isLoadingSchema || isLoading;

  return (
    <List
      isLoading={isLoadingAny}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transcriptions..."
      throttle
    >
      {loadError ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to Read Transcriptions" description={loadError.message} />
      ) : transcriptions.length === 0 && !isLoadingAny ? (
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
