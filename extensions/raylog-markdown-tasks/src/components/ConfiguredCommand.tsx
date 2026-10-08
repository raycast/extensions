import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import { ReactNode, useEffect, useState } from "react";
import { getConfiguredStorageNotePath } from "../lib/config";
import { RAYLOG_SCHEMA_VERSION } from "../lib/constants";
import { getTaskActionIcon } from "../lib/task-visuals";
import {
  ensureStorageNote,
  getRaylogErrorMessage,
  isRaylogCorruptionError,
  RaylogInitializationRequiredError,
  RaylogParseError,
  RaylogSchemaError,
  resetStorageNote,
} from "../lib/storage";

interface ConfiguredCommandProps {
  children: (notePath: string) => ReactNode;
}

export default function ConfiguredCommand({ children }: ConfiguredCommandProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [notePath, setNotePath] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [canReset, setCanReset] = useState(false);
  const [canGenerateDatabase, setCanGenerateDatabase] = useState(false);
  const [isSchemaError, setIsSchemaError] = useState(false);
  const [isCorruptedStorage, setIsCorruptedStorage] = useState(false);
  const [currentSchemaVersion, setCurrentSchemaVersion] = useState<number | undefined>();

  useEffect(() => {
    void loadConfiguredNote();
  }, []);

  async function loadConfiguredNote() {
    const configuredNotePath = getConfiguredStorageNotePath();
    setIsLoading(true);
    setCanReset(false);
    setCanGenerateDatabase(false);
    setIsSchemaError(false);
    setIsCorruptedStorage(false);
    setCurrentSchemaVersion(undefined);

    if (!configuredNotePath) {
      setNotePath(undefined);
      setMessage("Choose a markdown file in Raycast extension preferences to continue.");
      setIsLoading(false);
      return;
    }

    try {
      await ensureStorageNote(configuredNotePath);
      setNotePath(configuredNotePath);
      setMessage(undefined);
    } catch (error) {
      let resolvedError = error;

      if (error instanceof RaylogInitializationRequiredError && (await isMarkdownFileEmpty(configuredNotePath))) {
        try {
          await resetStorageNote(configuredNotePath);
          await ensureStorageNote(configuredNotePath);
          setNotePath(configuredNotePath);
          setMessage(undefined);
          return;
        } catch (initializationError) {
          resolvedError = initializationError;
        }
      }

      setNotePath(undefined);
      setMessage(getRaylogErrorMessage(resolvedError, "Unable to load Raylog storage."));
      setCanGenerateDatabase(resolvedError instanceof RaylogInitializationRequiredError);
      setCanReset(resolvedError instanceof RaylogParseError || resolvedError instanceof RaylogSchemaError);
      setIsSchemaError(resolvedError instanceof RaylogSchemaError);
      setIsCorruptedStorage(isRaylogCorruptionError(resolvedError));
      if (resolvedError instanceof RaylogSchemaError) {
        setCurrentSchemaVersion(await readSchemaVersionFromNote(configuredNotePath));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetStorage() {
    const configuredNotePath = getConfiguredStorageNotePath();
    if (!configuredNotePath) {
      return;
    }

    setIsLoading(true);
    try {
      await resetStorageNote(configuredNotePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Storage note reset",
      });
      await loadConfiguredNote();
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to reset storage",
        message: getRaylogErrorMessage(error, "Unable to reset the storage note."),
      });
    }
  }

  async function handleGenerateStorage() {
    const configuredNotePath = getConfiguredStorageNotePath();
    if (!configuredNotePath) {
      return;
    }

    const confirmed = await confirmAlert({
      title: "Create Raylog Database?",
      message: `Create a Raylog database in "${path.basename(configuredNotePath)}"? Existing markdown outside the managed block will be preserved.`,
      primaryAction: {
        title: "Create Database",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await resetStorageNote(configuredNotePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Raylog database created",
      });
      await loadConfiguredNote();
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to generate database",
        message: getRaylogErrorMessage(error, "Unable to generate the task database."),
      });
    }
  }

  if (isLoading) {
    return <List isLoading />;
  }

  if (!notePath) {
    if (!canGenerateDatabase && !canReset && !isSchemaError && !isCorruptedStorage) {
      return (
        <List>
          <List.EmptyView
            icon={Icon.Document}
            title="Set Up Raylog Storage"
            description={message ?? "Choose the markdown file Raylog should use in Raycast extension preferences."}
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Preferences"
                  icon={getTaskActionIcon("Open Extension Preferences")}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return (
      <List>
        <List.EmptyView
          icon={isCorruptedStorage || isSchemaError ? Icon.Warning : Icon.Document}
          title={
            isSchemaError
              ? `Schema v${currentSchemaVersion ?? "?"} -> v${RAYLOG_SCHEMA_VERSION} Required`
              : isCorruptedStorage
                ? "Corrupted Raylog Database"
                : "Set Up Raylog Storage"
          }
          description={buildEmptyStateDescription({
            message: message ?? "Choose a markdown file in Raycast extension preferences to continue.",
            configuredNotePath: getConfiguredStorageNotePath(),
            canGenerateDatabase,
            isSchemaError,
            currentSchemaVersion,
          })}
          actions={
            <ActionPanel>
              {canGenerateDatabase && (
                <Action
                  title="Create Raylog Database"
                  icon={getTaskActionIcon("Add Task")}
                  onAction={handleGenerateStorage}
                />
              )}
              {canReset && (
                <Action title="Reset Storage Note" icon={Icon.ArrowCounterClockwise} onAction={handleResetStorage} />
              )}
              <Action
                title="Open Extension Preferences"
                icon={getTaskActionIcon("Open Extension Preferences")}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children(notePath)}</>;
}

function buildEmptyStateDescription({
  message,
  configuredNotePath,
  canGenerateDatabase,
  isSchemaError,
  currentSchemaVersion,
}: {
  message: string;
  configuredNotePath?: string;
  canGenerateDatabase: boolean;
  isSchemaError: boolean;
  currentSchemaVersion?: number;
}): string {
  if (canGenerateDatabase) {
    return `"${path.basename(configuredNotePath ?? "note.md")}" does not have a Raylog database yet. Create one to continue.`;
  }

  if (!isSchemaError) {
    return message;
  }

  return `"${path.basename(configuredNotePath ?? "note.md")}" uses schema v${currentSchemaVersion ?? "?"}. Raylog needs v${RAYLOG_SCHEMA_VERSION}. Reset the file to continue.`;
}

async function readSchemaVersionFromNote(notePath: string): Promise<number | undefined> {
  try {
    const markdown = await fs.promises.readFile(notePath, "utf8");
    const match = markdown.match(/"schemaVersion"\s*:\s*(\d+)/);
    if (!match) {
      return undefined;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

async function isMarkdownFileEmpty(notePath: string): Promise<boolean> {
  try {
    const markdown = await fs.promises.readFile(notePath, "utf8");
    return markdown.trim().length === 0;
  } catch {
    return false;
  }
}
