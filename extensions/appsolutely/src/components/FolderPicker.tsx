import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { LauncherApplication } from "../models/application";
import { useLauncherState } from "../hooks/useLauncherState";
import { assignmentFor, moveApplication } from "../services/application-model";
import { descendants, folderPath, moveFolder } from "../utils/hierarchy";
import { perform } from "./feedback";

type Props = { app: LauncherApplication; folderId?: never } | { app?: never; folderId: string };

export function FolderPicker({ app, folderId }: Props) {
  const { state, update } = useLauncherState();
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);
  const excluded = folderId ? descendants(state.folders, folderId) : new Set<string>();
  const current = app
    ? (assignmentFor(app, state)?.folderId ?? null)
    : (state.folders.find((f) => f.id === folderId)?.parentId ?? null);
  const destinations = state.folders
    .filter((f) => !excluded.has(f.id))
    .map((f) => ({ id: f.id, name: folderPath(state.folders, f.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  async function move(destination: string | null) {
    if (saving) return;
    setSaving(true);
    const saved = await perform("Could Not Move Item", () =>
      update((latest) =>
        app ? moveApplication(latest, app, destination) : moveFolder(latest, folderId!, destination),
      ),
    );
    setSaving(false);
    if (saved) pop();
  }

  function actions(destination: string | null) {
    return (
      <ActionPanel>
        <Action title="Move Here" icon={Icon.Folder} onAction={() => move(destination)} />
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={`Move ${app?.name ?? "Folder"}`}
      searchBarPlaceholder="Choose a destination…"
      isLoading={saving}
    >
      <List.Item
        title="Appsolutely"
        subtitle="Home"
        icon={Icon.House}
        accessories={current === null ? [{ tag: "Current" }] : []}
        actions={actions(null)}
      />
      {destinations.map((destination) => (
        <List.Item
          key={destination.id}
          title={destination.name}
          icon={Icon.Folder}
          accessories={current === destination.id ? [{ tag: "Current" }] : []}
          actions={actions(destination.id)}
        />
      ))}
    </List>
  );
}
