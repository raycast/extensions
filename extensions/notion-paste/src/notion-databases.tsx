import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useMemo } from "react";
import { NotionSearch } from "./components/notion-search";
import type {
  CommandPreferences,
  DatabaseConfig,
  ExtensionPreferences,
} from "./types";

interface DatabasesPreferences extends ExtensionPreferences {
  databasesJson: string;
}

function parseDatabases(input: string): DatabaseConfig[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Databases JSON must be an array");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Database entry #${index + 1} must be an object`);
    }

    const value = entry as Partial<DatabaseConfig> & Record<string, unknown>;

    const label = typeof value.label === "string" ? value.label.trim() : "";
    const databaseId =
      typeof value.databaseId === "string" ? value.databaseId.trim() : "";
    const searchProperty =
      typeof value.searchProperty === "string"
        ? value.searchProperty.trim()
        : "";
    const searchPropertyType = value.searchPropertyType;
    const displayProperties =
      typeof value.displayProperties === "string"
        ? value.displayProperties.trim()
        : "";
    const pickerProperties =
      typeof value.pickerProperties === "string"
        ? value.pickerProperties.trim()
        : "";

    if (!label) {
      throw new Error(`Database entry #${index + 1} is missing 'label'`);
    }
    if (!databaseId) {
      throw new Error(`Database entry #${index + 1} is missing 'databaseId'`);
    }
    if (!searchProperty) {
      throw new Error(
        `Database entry #${index + 1} is missing 'searchProperty'`,
      );
    }
    if (searchPropertyType !== "title" && searchPropertyType !== "rich_text") {
      throw new Error(
        `Database entry #${index + 1} has invalid 'searchPropertyType' (use 'title' or 'rich_text')`,
      );
    }
    if (!displayProperties) {
      throw new Error(
        `Database entry #${index + 1} is missing 'displayProperties'`,
      );
    }
    if (!pickerProperties) {
      throw new Error(
        `Database entry #${index + 1} is missing 'pickerProperties'`,
      );
    }

    const filterProperty =
      typeof value.filterProperty === "string"
        ? value.filterProperty.trim()
        : "";
    const filterValues =
      typeof value.filterValues === "string" ? value.filterValues.trim() : "";
    const filterPropertyType = value.filterPropertyType ?? "status";

    if (filterPropertyType !== "status" && filterPropertyType !== "select") {
      throw new Error(
        `Database entry #${index + 1} has invalid 'filterPropertyType' (use 'status' or 'select')`,
      );
    }

    return {
      label,
      databaseId,
      searchProperty,
      searchPropertyType,
      displayProperties,
      pickerProperties,
      filterProperty,
      filterPropertyType,
      filterValues,
    };
  });
}

export default function NotionDatabasesCommand() {
  const preferences = useMemo(() => {
    try {
      return getPreferences();
    } catch (error) {
      return { error };
    }
  }, []);

  if ("error" in preferences) {
    const message =
      preferences.error instanceof Error
        ? preferences.error.message
        : String(preferences.error);

    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Invalid databases JSON"
          description={message}
          actions={
            <ActionPanel>
              <Action
                title="Open Command Preferences"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { notionApiKey, databases } = preferences;

  if (!databases.length) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.List}
          title="No databases configured"
          description="Add database entries in the command preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Command Preferences"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Select a database…">
      {databases.map((database) => (
        <List.Item
          key={`${database.label}-${database.databaseId}`}
          title={database.label}
          subtitle={database.searchProperty}
          accessories={[
            {
              tag: {
                value:
                  database.searchPropertyType === "title"
                    ? "Title"
                    : "Rich Text",
                color: Color.Blue,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title={`Search ${database.label}`}
                icon={Icon.MagnifyingGlass}
                target={
                  <NotionSearch
                    preferences={buildCommandPreferences(
                      notionApiKey,
                      database,
                    )}
                    commandTitle={database.label}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getPreferences() {
  const preferences = getPreferenceValues<DatabasesPreferences>();
  const databases = parseDatabases(preferences.databasesJson ?? "");
  return {
    notionApiKey: preferences.notionApiKey,
    databases,
  };
}

function buildCommandPreferences(
  notionApiKey: string,
  database: DatabaseConfig,
): CommandPreferences {
  return {
    notionApiKey,
    databaseId: database.databaseId,
    searchProperty: database.searchProperty,
    searchPropertyType: database.searchPropertyType,
    displayProperties: database.displayProperties,
    pickerProperties: database.pickerProperties,
    filterProperty: database.filterProperty ?? "",
    filterPropertyType: database.filterPropertyType ?? "status",
    filterValues: database.filterValues ?? "",
  };
}
