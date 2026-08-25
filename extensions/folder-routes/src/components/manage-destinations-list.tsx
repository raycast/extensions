import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showInFinder,
  showToast,
} from "@raycast/api";

import { sortDestinations, type Destination } from "../domain/destination";
import { exportDestinations } from "../services/destination-export";
import { saveDestinationLibrary } from "../services/destination-library";
import { DestinationForm } from "./destination-form";
import { ImportDestinationsForm } from "./import-destinations";
import { useDestinations } from "./use-destinations";

export function ManageDestinationsList() {
  const state = useDestinations();
  const destinations = sortDestinations(state.destinations);
  const { destinationsCsvFile } = getPreferenceValues<{ destinationsCsvFile?: string }>();

  async function remove(destination: Destination) {
    const confirmed = await confirmAlert({
      title: `Delete “${destination.name}”?`,
      message: "This removes the saved destination only. Files in the folder are not changed.",
      primaryAction: { title: "Delete Destination", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    try {
      const next = state.destinations.filter((current) => current.id !== destination.id);
      await saveDestinationLibrary(next, destinationsCsvFile);
      state.setDestinations(next);
      await showToast({ style: Toast.Style.Success, title: "Destination deleted", message: destination.name });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete destination",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function togglePinned(destination: Destination) {
    try {
      const next = state.destinations.map((current) =>
        current.id === destination.id ? { ...current, pinned: !current.pinned } : current,
      );
      await saveDestinationLibrary(next, destinationsCsvFile);
      state.setDestinations(next);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update destination",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function exportAll() {
    try {
      const path = await exportDestinations(state.destinations);
      const toast = await showToast({
        style: Toast.Style.Success,
        title: `Exported ${state.destinations.length} destinations`,
        message: path,
      });
      toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not export destinations",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function commonActions() {
    return (
      <>
        <Action.Push
          title="Add Destination"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <DestinationForm
              existing={state.destinations}
              destinationsCsvFile={destinationsCsvFile}
              onSaved={(updated) => state.setDestinations(updated)}
            />
          }
        />
        <Action.Push
          title="Import Destinations"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          target={
            <ImportDestinationsForm
              existing={state.destinations}
              destinationsCsvFile={destinationsCsvFile}
              onImported={(updated) => state.setDestinations(updated)}
            />
          }
        />
        <Action
          title="Export All Destinations"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={exportAll}
        />
      </>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Manage Destinations"
      searchBarPlaceholder="Search names, paths, and aliases"
      actions={<ActionPanel>{commonActions()}</ActionPanel>}
    >
      {!state.isLoading && destinations.length === 0 ? (
        <List.EmptyView
          icon={state.error ? Icon.Warning : Icon.Folder}
          title={state.error ? "Could Not Load Destinations" : "No Destinations Yet"}
          description={
            state.error?.message ??
            "Add one folder or import a CSV or JSON file to create your reusable destination list."
          }
        />
      ) : (
        destinations.map((destination) => (
          <List.Item
            key={destination.id}
            id={destination.id}
            icon={{ fileIcon: destination.path }}
            title={destination.name}
            subtitle={destination.path}
            keywords={[destination.path, ...destination.keywords]}
            accessories={[
              ...(destination.copy ? [{ tag: "Copy" }] : []),
              ...(destination.move ? [{ tag: "Move" }] : []),
              ...(destination.pinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Destination"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <DestinationForm
                        destination={destination}
                        existing={state.destinations}
                        destinationsCsvFile={destinationsCsvFile}
                        onSaved={(updated) => state.setDestinations(updated)}
                      />
                    }
                  />
                  <Action
                    title={destination.pinned ? "Unpin Destination" : "Pin Destination"}
                    icon={destination.pinned ? Icon.PinDisabled : Icon.Pin}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() => togglePinned(destination)}
                  />
                  <Action.ShowInFinder path={destination.path} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {commonActions()}
                  <Action
                    title="Delete Destination"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(destination)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
