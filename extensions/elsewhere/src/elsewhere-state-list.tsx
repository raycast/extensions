import { ReactNode } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { executeElsewhereCommand } from "./command-runner";
import { ElsewhereSnapshotV1, ElsewhereStateReadResult } from "./state-reader";
import { useElsewhereState } from "./use-elsewhere-state";

interface ElsewhereStateListProps {
  searchBarPlaceholder: string;
  children: (snapshot: ElsewhereSnapshotV1, refresh: () => Promise<void>) => ReactNode;
}

function StateEmptyView({ state, refresh }: { state: ElsewhereStateReadResult; refresh: () => Promise<void> }) {
  let title = "Open Elsewhere to Connect";
  let description = "Press Enter to open Elsewhere. This command will continue automatically when it’s ready.";
  let icon = Icon.Waveform;

  if (state.kind === "stale") {
    title = "Elsewhere Isn’t Running";
    description = "Press Enter to open Elsewhere. This command will continue automatically when it’s ready.";
    icon = Icon.Stop;
  } else if (state.kind === "malformed") {
    title = "Elsewhere State Could Not Be Read";
    description = "The app published a malformed state snapshot. Opening Elsewhere may refresh it.";
    icon = Icon.ExclamationMark;
  } else if (state.kind === "unsupported") {
    title = "Elsewhere State Is Newer Than This Extension";
    description = `Snapshot schema ${state.schemaVersion} is not supported yet. Update this extension to continue.`;
    icon = Icon.ExclamationMark;
  } else if (state.kind === "error") {
    title = "Elsewhere State Is Unavailable";
    description =
      "Raycast could not access Elsewhere’s published state. Check that the app can write to Application Support.";
    icon = Icon.ExclamationMark;
  } else if (state.kind === "ready" && !state.snapshot.ready) {
    title = state.snapshot.requiresSetup ? "Finish Setting Up Elsewhere" : "Elsewhere Is Starting";
    description = state.snapshot.requiresSetup
      ? "Choose your first Space in Elsewhere, then return here."
      : "The app is running but its controls are not ready yet.";
  }

  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action
            title="Open Elsewhere and Continue"
            icon={Icon.AppWindow}
            onAction={() =>
              executeElsewhereCommand(
                { kind: "navigation", destination: "main" },
                { successTitle: "Elsewhere Opened", onSettled: refresh },
              )
            }
          />
          <Action title="Refresh State" icon={Icon.ArrowClockwise} onAction={refresh} />
        </ActionPanel>
      }
    />
  );
}

export function ElsewhereStateList({ searchBarPlaceholder, children }: ElsewhereStateListProps) {
  const { state, isLoading, refresh } = useElsewhereState();

  if (!state || state.kind !== "ready" || !state.snapshot.ready) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
        {state ? <StateEmptyView state={state} refresh={refresh} /> : null}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {children(state.snapshot, refresh)}
    </List>
  );
}
