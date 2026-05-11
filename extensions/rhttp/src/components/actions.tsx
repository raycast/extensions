import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { $collections, $currentCollectionId, createCollection, updateCollection } from "../store";
import { $currentEnvironmentId, $environments } from "../store/environments";
import { ManageVariablesList } from "../views/manage-variables-list";
import { HistoryView } from "../views/history-list-view";
import { $collectionSortPreferences, $isHistoryEnabled } from "../store/settings";
import { type Collection, environmentsSchema, newCollectionSchema } from "~/types";
import { useAtom } from "zod-persist/react";
import { parseCurlToRequest } from "~/utils/curl-to-request";
import { RequestForm } from "~/views/request-form";
import { resolveVariables } from "~/utils";
import { JSX } from "react";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { randomUUID } from "crypto";
import { backupAllData } from "~/utils/backup";
import { SORT_OPTIONS, SortOption } from "~/constants";
import { $cookies } from "~/store/cookies";
import { HelpView } from "~/views/help-view";
import z from "zod";
import { ErrorDetail } from "~/views/error-view";

async function handleSelectEnvironment(envId: string) {
  const currentCollectionId = $currentCollectionId.get();
  if (currentCollectionId) {
    await updateCollection(currentCollectionId, { lastActiveEnvironmentId: envId });
  }
  $currentEnvironmentId.set(envId);
}

export function SelectEnvironmentMenu() {
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: allEnvironments } = useAtom($environments);
  const currentEnvironment = allEnvironments.find((e) => e.id === currentEnvironmentId);
  return (
    <ActionPanel.Submenu
      title="Select Environment"
      icon={Icon.Key}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "p" },
        windows: { modifiers: ["ctrl", "shift"], key: "p" },
      }}
    >
      {allEnvironments.map((env) => (
        <Action
          key={env.id}
          icon={currentEnvironment?.id === env.id ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
          title={env.name}
          onAction={() => {
            void handleSelectEnvironment(env.id).catch((error) => {
              void showToast({
                style: Toast.Style.Failure,
                title: "Operation failed",
                message: error instanceof Error ? error.message : "Unknown error",
              });
            });
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function EnvironmentActions() {
  return (
    <>
      <SelectEnvironmentMenu />

      <Action.Push
        title="Manage Environments"
        icon={Icon.Pencil}
        target={<ManageVariablesList />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "v" },
          windows: { modifiers: ["ctrl", "shift"], key: "v" },
        }}
      />
    </>
  );
}

export function HistoryActions() {
  const { value: isHistoryEnabled } = useAtom($isHistoryEnabled);
  return (
    <>
      <Action.Push
        title="View History"
        icon={Icon.Clock}
        target={<HistoryView />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "h" },
          windows: { modifiers: ["ctrl", "shift"], key: "h" },
        }}
      />
      <Action
        title={isHistoryEnabled ? "Disable History" : "Enable History"}
        icon={isHistoryEnabled ? Icon.Stop : Icon.Clock}
        onAction={() => {
          void showToast({ title: !isHistoryEnabled ? "Recording history" : "Stopped recording history" });
          $isHistoryEnabled.set(!isHistoryEnabled);
        }}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
      />
    </>
  );
}

export function CollectionActions({ children }: { children?: JSX.Element | JSX.Element[] | null }) {
  const { push } = useNavigation();
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: collections } = useAtom($collections);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  return (
    <ActionPanel.Section title="Collection">
      {children}
      {currentCollection && (
        <Action
          title="Export Collection"
          icon={Icon.Upload}
          onAction={async () => {
            try {
              // We use our Zod schema to validate and strip the IDs, preparing it for export.
              const exportableCollection = newCollectionSchema.parse(currentCollection);
              const jsonString = JSON.stringify(exportableCollection, null, 2);
              await Clipboard.copy(jsonString);
              await showToast({ title: "Collection Copied to Clipboard" });
            } catch (error) {
              console.error(error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to Export" });
            }
          }}
        />
      )}
      <Action
        title="Import Collection from Clipboard"
        icon={Icon.Download}
        onAction={async () => {
          try {
            const clipboardText = await Clipboard.readText();
            if (!clipboardText) {
              throw new Error("Clipboard is empty.");
            }
            const data = JSON.parse(clipboardText);
            // Validate the clipboard data against our schema
            const newCollectionData = newCollectionSchema.parse(data);
            await createCollection(newCollectionData);
            await showToast({ title: "Collection Imported Successfully" });
          } catch (error) {
            if (error instanceof z.ZodError) {
              push(<ErrorDetail error={error} />);
            }
            await showToast({
              style: Toast.Style.Failure,
              title: "Import Failed",
              message: "Clipboard does not contain a valid collection.",
            });
          }
        }}
      />
    </ActionPanel.Section>
  );
}

export function CopyVariableAction({
  currentRequestPreActions,
}: {
  currentRequestPreActions?: Array<{ requestId: string; enabled: boolean }>;
} = {}) {
  const resolvedVariables = resolveVariables();
  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);

  const currentCollection = collections.find((c) => c.id === currentCollectionId);

  // Get temp variable keys based on pre-request actions
  const tempVariableKeys = new Set<string>();

  if (currentRequestPreActions && currentRequestPreActions.length > 0) {
    // Only show temp vars from requests that are in the pre-request chain
    const preRequestIds = new Set(
      currentRequestPreActions.filter((action) => action.enabled).map((action) => action.requestId),
    );

    currentCollection?.requests.forEach((request) => {
      // Only include temp vars from requests that are pre-request actions
      if (preRequestIds.has(request.id)) {
        request.responseActions?.forEach((action) => {
          if (action.storage === "TEMPORARY") {
            tempVariableKeys.add(action.variableKey);
          }
        });
      }
    });
  }

  const allKeys = [...Object.keys(resolvedVariables), ...Array.from(tempVariableKeys)];

  return (
    <ActionPanel.Submenu
      title="Copy Variable"
      icon={Icon.Key}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "i" },
        windows: { modifiers: ["ctrl", "shift"], key: "i" },
      }}
    >
      {allKeys.length > 0 ? (
        allKeys.map((key) => {
          const isTemp = tempVariableKeys.has(key);

          return (
            <Action
              key={key}
              title={`{{${key}}}`}
              icon={
                isTemp ? { source: Icon.Clock, tintColor: Color.Orange } : { source: Icon.Key, tintColor: Color.Green }
              }
              onAction={async () => {
                const content = `{{${key}}}`;
                await Clipboard.copy(content);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied Placeholder",
                });
              }}
            />
          );
        })
      ) : (
        <Action title="No Variables in Scope" />
      )}
    </ActionPanel.Submenu>
  );
}

export function NewRequestFromCurlAction() {
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: collections } = useAtom($collections);
  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const { push } = useNavigation();
  return (
    <Action
      title="New Request from cURL"
      icon={Icon.Clipboard}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "u" },
        windows: { modifiers: ["ctrl", "shift"], key: "u" },
      }}
      onAction={async () => {
        if (!currentCollection) {
          await showToast({ style: Toast.Style.Failure, title: "No Collection Selected" });
          return;
        }
        try {
          const clipboardText = await Clipboard.readText();
          if (!clipboardText?.startsWith("curl")) {
            throw new Error("Clipboard does not contain a cURL command.");
          }
          const parsedRequest = parseCurlToRequest(clipboardText);
          if (!parsedRequest) {
            throw new Error("Could not parse the cURL command.");
          }
          // Push the form, pre-filled with the parsed data
          push(<RequestForm collectionId={currentCollection.id} request={parsedRequest} />);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Import Failed",
            message: String(error),
          });
        }
      }}
    />
  );
}

export function OpenInEditorAction({
  responseBody,
  shortcut = Keyboard.Shortcut.Common.Open,
  fileType = "json",
}: {
  responseBody: string;
  shortcut?: Keyboard.Shortcut;
  fileType?: string;
}) {
  return (
    <Action
      title="Open Response in Editor"
      icon={Icon.Code}
      shortcut={shortcut}
      onAction={async () => {
        const tempPath = path.join(os.tmpdir(), `response-${randomUUID()}.${fileType}`);
        await fs.writeFile(tempPath, responseBody);

        // Get the editor name from your extension's preferences
        const { preferredEditor } = getPreferenceValues<{ preferredEditor: string }>();

        // The `open` command can take an application name as a second argument.
        // If the preference is empty, it will be `undefined` and `open` will use the system default.
        await open(tempPath, preferredEditor || undefined);
      }}
    />
  );
}

export function SortRequestsMenu({
  currentCollection,
  onSort,
}: {
  currentCollection: Collection;
  onSort: (sortKey: SortOption) => void;
}) {
  const { value: sortPreferences } = useAtom($collectionSortPreferences);
  const currentSort = sortPreferences[currentCollection.id] ?? SORT_OPTIONS.MANUAL;

  return (
    <ActionPanel.Submenu
      title="Sort Requests"
      icon={Icon.ArrowUpCircle}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "s" },
        windows: { modifiers: ["ctrl", "shift"], key: "s" },
      }}
    >
      <Action
        title="By Name (A-Z)"
        icon={currentSort === SORT_OPTIONS.NAME_ASC ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
        onAction={() => onSort(SORT_OPTIONS.NAME_ASC)}
      />
      <Action
        title="By Name (Z-A)"
        icon={currentSort === SORT_OPTIONS.NAME_DESC ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
        onAction={() => onSort(SORT_OPTIONS.NAME_DESC)}
      />
      <Action
        title="By Method"
        icon={currentSort === SORT_OPTIONS.METHOD ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
        onAction={() => onSort(SORT_OPTIONS.METHOD)}
      />
      <Action
        title="By URL"
        icon={currentSort === SORT_OPTIONS.URL ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
        onAction={() => onSort(SORT_OPTIONS.URL)}
      />
      <Action
        title="Original Order"
        icon={currentSort === SORT_OPTIONS.MANUAL ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Dot}
        onAction={() => onSort(SORT_OPTIONS.MANUAL)}
      />
    </ActionPanel.Submenu>
  );
}

export function GlobalActions() {
  const { push } = useNavigation();
  return (
    <ActionPanel.Section title="Global Actions">
      <EnvironmentActions />
      <HistoryActions />
      <Action
        title="Backup All Data"
        icon={Icon.HardDrive}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "b" },
          windows: { modifiers: ["ctrl", "shift"], key: "b" },
        }}
        onAction={async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Creating backup..." });
          try {
            await backupAllData();
            toast.style = Toast.Style.Success;
            toast.title = "Backup Successful";
            toast.message = "Files saved in a new timestamped folder.";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Backup Failed";
            toast.message = String(error);
          }
        }}
      />
      <Action
        title="Import Environments from Clipboard"
        icon={Icon.Download}
        onAction={async () => {
          try {
            const clipboardText = await Clipboard.readText();
            if (!clipboardText) {
              throw new Error("Clipboard is empty.");
            }
            const data = JSON.parse(clipboardText);

            // Validate the clipboard data
            const environments = environmentsSchema.parse(data);

            // Confirm before overwriting
            if (
              await confirmAlert({
                title: "Import Environments?",
                message: "This will replace all existing environments. Continue?",
                primaryAction: { title: "Import", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await $environments.setAndFlush(environments);
              await showToast({ title: "Environments Imported Successfully" });
            }
          } catch (error) {
            if (error instanceof z.ZodError) {
              push(<ErrorDetail error={error} />);
            }
            await showToast({
              style: Toast.Style.Failure,
              title: "Import Failed",
              message: "Clipboard does not contain valid environments data.",
            });
          }
        }}
      />
      <Action
        title="Clear All Cookies"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Clear All Cookies?",
              message: "This will delete all stored cookies from all domains.",
              primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
            })
          ) {
            await $cookies.setAndFlush({});
            await showToast({
              style: Toast.Style.Success,
              title: "Cookies Cleared",
            });
          }
        }}
      />
      <Action.Push
        title="Help & Documentation"
        icon={Icon.QuestionMark}
        target={<HelpView />}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "/" },
          windows: { modifiers: ["ctrl"], key: "/" },
        }}
      />
    </ActionPanel.Section>
  );
}
