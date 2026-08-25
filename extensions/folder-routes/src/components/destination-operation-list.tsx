import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  showToast,
} from "@raycast/api";
import { basename } from "node:path";
import { useEffect, useMemo, useState } from "react";

import { sortDestinations } from "../domain/destination";
import { getFinderSelection } from "../services/finder-selection";
import { type FileOperationMode, performFileOperation } from "../services/file-operations";
import { useDestinations } from "./use-destinations";

export interface DestinationOperationListProps {
  mode: FileOperationMode;
}

export function DestinationOperationList({ mode }: DestinationOperationListProps) {
  const destinationState = useDestinations();
  const [selection, setSelection] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<Error>();
  const [isSelectionLoading, setIsSelectionLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const verb = mode === "copy" ? "Copy" : "Move";

  useEffect(() => {
    async function loadSelection() {
      setIsSelectionLoading(true);
      try {
        setSelection(await getFinderSelection());
        setSelectionError(undefined);
      } catch (error) {
        setSelectionError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsSelectionLoading(false);
      }
    }

    void loadSelection();
  }, []);

  const destinations = useMemo(
    () => sortDestinations(destinationState.destinations.filter((destination) => destination[mode])),
    [destinationState.destinations, mode],
  );

  async function run(destinationPath: string, destinationName: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${verb}ing ${formatCount(selection.length, "item")}`,
      message: destinationName,
    });

    try {
      const summary = await performFileOperation(mode, selection, destinationPath, {
        conflictBehavior: preferences.conflictBehavior,
        confirmOverwrite: async (sourcePath, targetPath) =>
          confirmAlert({
            title: `Replace “${basename(targetPath)}”?`,
            message: `A destination item already exists.\n\nSource: ${sourcePath}\nDestination: ${targetPath}`,
            primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
            dismissAction: { title: "Skip", style: Alert.ActionStyle.Cancel },
          }),
      });

      toast.style = summary.failedCount > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title =
        summary.failedCount > 0
          ? `${verb} completed with errors`
          : summary.successCount > 0
            ? `${verb === "Copy" ? "Copied" : "Moved"} ${formatCount(summary.successCount, "item")}`
            : `No items ${mode === "copy" ? "copied" : "moved"}`;
      toast.message = [
        summary.skippedCount > 0 ? `${summary.skippedCount} skipped` : "",
        summary.failedCount > 0 ? `${summary.failedCount} failed` : "",
        summary.results.find((result) => result.status === "failed")?.message ?? "",
        summary.results.find((result) => result.status === "success" && result.message)?.message ?? "",
      ]
        .filter(Boolean)
        .join(" · ");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${verb} failed`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const error = selectionError ?? destinationState.error;
  const isLoading = isSelectionLoading || destinationState.isLoading;
  const emptyTitle = error
    ? "Could Not Load This Command"
    : selection.length === 0
      ? "No Finder Items Selected"
      : "No Enabled Destinations";
  const emptyDescription = error
    ? error.message
    : selection.length === 0
      ? "Select one or more files or folders in Finder, then run this command again."
      : `Add a destination with ${mode} enabled in Manage Destinations.`;
  const shouldShowEmpty = !isLoading && (error !== undefined || selection.length === 0 || destinations.length === 0);

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      navigationTitle={`${verb} ${formatCount(selection.length, "Finder item")} To`}
      searchBarPlaceholder="Search names, paths, and aliases"
      actions={
        <ActionPanel>
          <Action
            title="Manage Destinations"
            icon={Icon.Gear}
            onAction={() => launchCommand({ name: "manage-destinations", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      {shouldShowEmpty ? (
        <List.EmptyView icon={error ? Icon.Warning : Icon.Folder} title={emptyTitle} description={emptyDescription} />
      ) : (
        destinations.map((destination) => (
          <List.Item
            key={destination.id}
            id={destination.id}
            icon={{ fileIcon: destination.path }}
            title={destination.name}
            subtitle={destination.path}
            keywords={[destination.path, ...destination.keywords]}
            accessories={destination.pinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={`${verb} Here`}
                  icon={mode === "copy" ? Icon.CopyClipboard : Icon.ArrowRight}
                  onAction={() => run(destination.path, destination.name)}
                />
                <Action.ShowInFinder path={destination.path} />
                <Action
                  title="Manage Destinations"
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  onAction={() => launchCommand({ name: "manage-destinations", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
