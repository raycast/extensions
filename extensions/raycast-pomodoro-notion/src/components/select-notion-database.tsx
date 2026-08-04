import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { searchNotionDatabases, validatePomodoroDatabase, type NotionDatabaseSummary } from "../lib/notion";
import { saveOAuthAccessToken, saveOAuthDatabaseSelection } from "../lib/notion-oauth/storage";

type SelectNotionDatabaseProps = {
  token: string;
  onSelected: () => void;
};

export function SelectNotionDatabase(props: SelectNotionDatabaseProps) {
  const { token, onSelected } = props;
  const [databases, setDatabases] = useState<NotionDatabaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadDatabases() {
      setIsLoading(true);
      setError(null);

      try {
        const results = await searchNotionDatabases(token);
        setDatabases(results);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDatabases();
  }, [token]);

  async function handleSelect(database: NotionDatabaseSummary) {
    setIsSaving(true);

    try {
      const validation = await validatePomodoroDatabase(token, database.id);
      if (!validation.ok) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Database schema does not match",
          message: validation.missingProperties.length
            ? `Missing: ${validation.missingProperties.join(", ")}`
            : "Fix property types in Notion and try again.",
        });
        return;
      }

      await saveOAuthAccessToken(token);
      await saveOAuthDatabaseSelection({
        databaseId: database.id,
        databaseTitle: validation.databaseTitle ?? database.title,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Work log database selected",
        message: validation.databaseTitle ?? database.title,
      });
      onSelected();
    } catch (selectError) {
      const message = selectError instanceof Error ? selectError.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not select database",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <List isLoading={isLoading || isSaving} searchBarPlaceholder="Search Notion databases...">
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load databases" description={error} />
      ) : null}
      {databases.length === 0 && !isLoading && !error ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No databases found"
          description="During OAuth, grant access to your work log database. Then reopen this screen or run Connect again."
        />
      ) : null}
      {databases.map((database) => (
        <List.Item
          key={database.id}
          icon={Icon.List}
          title={database.title}
          subtitle={database.id}
          actions={
            <ActionPanel>
              <Action
                title="Use as Work Log Database"
                icon={Icon.CheckCircle}
                onAction={() => handleSelect(database)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
