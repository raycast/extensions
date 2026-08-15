import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  buildPath,
  isDuplicate,
  movePathEntry,
  parsePath,
} from "./utils/path-utils.js";
import { getEnvVar, setEnvVar } from "./utils/powershell.js";
import { EnvScope, PathEntry } from "./utils/types.js";
import { PathEntryItem } from "./components/PathEntryItem.js";

function AddPathEntryForm({
  scope,
  entries,
  onAdded,
}: {
  scope: EnvScope;
  entries: PathEntry[];
  onAdded: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { path: string }) {
    const newPath = values.path.trim();
    if (!newPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Path is required",
      });
      return;
    }

    if (isDuplicate(entries, newPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Duplicate entry",
        message: "This path already exists in PATH",
      });
      return;
    }

    try {
      const currentPath = (await getEnvVar("PATH", scope)) ?? "";
      const newFullPath = currentPath ? `${currentPath};${newPath}` : newPath;

      if (scope === "Machine") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Elevation required...",
          message: "Approve the UAC prompt",
        });
      }

      await setEnvVar("PATH", newFullPath, scope);
      await showToast({
        style: Toast.Style.Success,
        title: "Path entry added",
        message: newPath,
      });
      onAdded();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add path entry",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle={`Add to ${scope === "Machine" ? "System" : "User"} PATH`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Path Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="path"
        title="Path"
        placeholder="C:\path\to\directory"
      />
    </Form>
  );
}

export default function EditPath() {
  const [userEntries, setUserEntries] = useState<PathEntry[]>([]);
  const [machineEntries, setMachineEntries] = useState<PathEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPaths = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userPath, machinePath] = await Promise.all([
        getEnvVar("PATH", "User"),
        getEnvVar("PATH", "Machine"),
      ]);

      setUserEntries(parsePath(userPath ?? "", "User"));
      setMachineEntries(parsePath(machinePath ?? "", "Machine"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load PATH",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  async function backupPath(scope: EnvScope) {
    const key = `path-backups-${scope}`;
    try {
      const currentPath = (await getEnvVar("PATH", scope)) ?? "";
      const raw = await LocalStorage.getItem<string>(key);
      const backups = raw
        ? (JSON.parse(raw) as { ts: number; value: string }[])
        : [];
      backups.push({ ts: Date.now(), value: currentPath });
      const max = 10;
      if (backups.length > max) backups.splice(0, backups.length - max);
      await LocalStorage.setItem(key, JSON.stringify(backups));
    } catch {
      // ignore LocalStorage errors
    }
  }

  async function savePath(entries: PathEntry[], scope: EnvScope) {
    try {
      await backupPath(scope);
      const newPath = buildPath(entries);

      if (scope === "Machine") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Elevation required...",
          message: "Approve the UAC prompt",
        });
      }

      await setEnvVar("PATH", newPath, scope);
      await showToast({ style: Toast.Style.Success, title: "PATH updated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save PATH",
        message,
      });
      await loadPaths();
    }
  }

  async function handleMove(
    scope: EnvScope,
    index: number,
    direction: "up" | "down",
  ) {
    const entries = scope === "User" ? userEntries : machineEntries;
    const setEntries = scope === "User" ? setUserEntries : setMachineEntries;
    const moved = movePathEntry(entries, index, direction);
    setEntries(moved);
    await savePath(moved, scope);
  }

  async function handleRemove(scope: EnvScope, index: number, path: string) {
    const confirmed = await confirmAlert({
      title: `Remove "${path}"?`,
      message: `This will remove the entry from the ${scope === "Machine" ? "System" : "User"} PATH.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const entries = scope === "User" ? [...userEntries] : [...machineEntries];
    const setEntries = scope === "User" ? setUserEntries : setMachineEntries;

    entries.splice(index, 1);
    const reindexed = entries.map((e, i) => ({ ...e, index: i }));
    setEntries(reindexed);
    await savePath(reindexed, scope);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section
        title="User PATH"
        subtitle={`${userEntries.length} entries`}
      >
        {userEntries.map((entry) => (
          <PathEntryItem
            key={`user-${entry.index}-${entry.path}`}
            entry={entry}
            total={userEntries.length}
            onMoveUp={() => handleMove("User", entry.index, "up")}
            onMoveDown={() => handleMove("User", entry.index, "down")}
            onRemove={() => handleRemove("User", entry.index, entry.path)}
            addForm={
              <AddPathEntryForm
                scope="User"
                entries={userEntries}
                onAdded={loadPaths}
              />
            }
            onRefresh={loadPaths}
          />
        ))}
      </List.Section>
      <List.Section
        title="System PATH"
        subtitle={`${machineEntries.length} entries`}
      >
        {machineEntries.map((entry) => (
          <PathEntryItem
            key={`machine-${entry.index}-${entry.path}`}
            entry={entry}
            total={machineEntries.length}
            onMoveUp={() => handleMove("Machine", entry.index, "up")}
            onMoveDown={() => handleMove("Machine", entry.index, "down")}
            onRemove={() => handleRemove("Machine", entry.index, entry.path)}
            addForm={
              <AddPathEntryForm
                scope="Machine"
                entries={machineEntries}
                onAdded={loadPaths}
              />
            }
            onRefresh={loadPaths}
          />
        ))}
      </List.Section>
      {!isLoading && userEntries.length + machineEntries.length === 0 && (
        <List.EmptyView
          title="No PATH entries"
          description="No PATH entries found"
        />
      )}
    </List>
  );
}
