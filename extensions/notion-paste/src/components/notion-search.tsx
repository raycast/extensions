import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openCommandPreferences,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchNotionDatabase } from "../notion-api";
import type { CommandPreferences, NotionRecord } from "../types";
import { useDebounce } from "../utils";
import { FieldPicker } from "./field-picker";

interface NotionSearchProps {
  preferences: CommandPreferences;
  commandTitle: string;
}

/**
 * Main search view. Renders a List that queries the configured Notion database
 * as the user types, then pushes a FieldPicker when a record is selected.
 */
export function NotionSearch({ preferences, commandTitle }: NotionSearchProps) {
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);

  const {
    data: records,
    isLoading,
    error,
  } = usePromise(
    async (query: string) => {
      return searchNotionDatabase(
        preferences.notionApiKey,
        preferences.databaseId,
        preferences.searchProperty,
        preferences.searchPropertyType,
        preferences.displayProperties,
        preferences.pickerProperties,
        query,
        preferences.filterProperty ?? "",
        preferences.filterPropertyType ?? "status",
        preferences.filterValues ?? "",
      );
    },
    [debouncedSearch],
    {
      onError: async (err) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Notion API error",
          message: err instanceof Error ? err.message : String(err),
        });
      },
    },
  );

  // Surface configuration / auth errors with helpful actions
  if (error) {
    const isAuthError =
      error.message?.toLowerCase().includes("unauthorized") ||
      error.message?.toLowerCase().includes("api key") ||
      error.message?.toLowerCase().includes("token");

    const isNotFoundError =
      error.message?.toLowerCase().includes("not found") ||
      error.message?.toLowerCase().includes("database");

    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={
            isAuthError
              ? "Invalid Notion API Key"
              : isNotFoundError
                ? "Database Not Found"
                : "Something went wrong"
          }
          description={
            isAuthError
              ? "Check your Notion API key in the extension preferences."
              : isNotFoundError
                ? "Check the Database ID in the command preferences. Also make sure your integration is shared with the database in Notion."
                : error.message
          }
          actions={
            <ActionPanel>
              {isAuthError ? (
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              ) : (
                <Action
                  title="Open Command Preferences"
                  icon={Icon.Gear}
                  onAction={openCommandPreferences}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${commandTitle}…`}
      throttle={false}
    >
      {!isLoading && (!records || records.length === 0) ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            debouncedSearch ? "No records found" : "Start typing to search"
          }
          description={
            debouncedSearch
              ? `No records matched "${debouncedSearch}" in the ${preferences.searchProperty} field.`
              : "Results will appear as you type, or wait a moment to see recent records."
          }
        />
      ) : (
        <List.Section
          title={
            debouncedSearch
              ? `Results for "${debouncedSearch}"`
              : "Recent records"
          }
          subtitle={
            records
              ? `${records.length} record${records.length !== 1 ? "s" : ""}`
              : undefined
          }
        >
          {(records ?? []).map((record) => (
            <NotionRecordItem key={record.id} record={record} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ---------------------------------------------------------------------------
// Individual record row
// ---------------------------------------------------------------------------

interface NotionRecordItemProps {
  record: NotionRecord;
}

function NotionRecordItem({ record }: NotionRecordItemProps) {
  return (
    <List.Item
      title={record.title}
      accessories={buildAccessories(record)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Pick a Field to Paste"
            icon={Icon.TextInput}
            target={<FieldPicker record={record} />}
          />
          <Action.OpenInBrowser
            title="Open in Notion"
            icon={Icon.Globe}
            url={record.url}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Record URL"
            icon={Icon.Link}
            content={record.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Accessories builder
// ---------------------------------------------------------------------------

function buildAccessories(record: NotionRecord): List.Item.Accessory[] {
  return record.displayProperties
    .filter((prop) => prop.value)
    .map((prop) => ({
      tag: {
        value:
          prop.value.length > 24 ? prop.value.slice(0, 21) + "…" : prop.value,
        color: Color.Blue,
      },
      tooltip: `${prop.name}: ${prop.value}`,
    }));
}
