import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { ScheduledCommand } from "../types";
import { STORAGE_KEYS } from "../utils/constants";
import { loadScheduledCommands, setStoredData } from "../utils/storage";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function replaceRawCommand(raw: unknown[], updated: ScheduledCommand): unknown[] {
  let replaced = false;
  const next = raw.map((entry) => {
    if (isRecord(entry) && entry.id === updated.id) {
      replaced = true;
      return updated;
    }
    return entry;
  });
  if (!replaced) {
    console.warn(`replaceRawCommand: id "${updated.id}" not found in raw array, appending`);
    return [...next, updated];
  }
  return next;
}

function removeRawCommand(raw: unknown[], id: string): unknown[] {
  return raw.filter((entry) => !(isRecord(entry) && entry.id === id));
}

export function useScheduledCommands() {
  const [commands, setCommands] = useState<ScheduledCommand[]>([]);
  const rawRef = useRef<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const persistRaw = useCallback(async (nextRaw: unknown[]) => {
    rawRef.current = nextRaw;
    await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, nextRaw);
  }, []);

  const loadCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      const loaded = await loadScheduledCommands(STORAGE_KEYS.SCHEDULED_COMMANDS);
      setCommands(loaded.commands);
      rawRef.current = loaded.raw;

      if (loaded.migratedCount > 0) {
        await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, loaded.raw);
      }
    } catch (error) {
      console.error("Error loading scheduled commands:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Scheduled Commands",
        message: error instanceof Error ? error.message : "Failed to load scheduled commands",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  const addCommand = useCallback(
    async (command: ScheduledCommand) => {
      setCommands((prevCommands) => [...prevCommands, command]);
      await persistRaw([...rawRef.current, command]);
    },
    [persistRaw],
  );

  const updateCommand = useCallback(
    async (updatedCommand: ScheduledCommand) => {
      setCommands((prevCommands) => prevCommands.map((cmd) => (cmd.id === updatedCommand.id ? updatedCommand : cmd)));
      await persistRaw(replaceRawCommand(rawRef.current, updatedCommand));
    },
    [persistRaw],
  );

  const deleteCommand = useCallback(
    async (commandId: string) => {
      const command = commands.find((cmd) => cmd.id === commandId);
      if (!command) return;

      const confirmed = await confirmAlert({
        title: "Delete Scheduled Command",
        message: `Are you sure you want to delete "${command.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        setCommands((prevCommands) => prevCommands.filter((cmd) => cmd.id !== commandId));
        await persistRaw(removeRawCommand(rawRef.current, commandId));

        await showToast({
          style: Toast.Style.Success,
          title: "Command deleted",
          message: `"${command.name}" has been deleted`,
        });
      }
    },
    [commands, persistRaw],
  );

  const toggleCommand = useCallback(
    async (commandId: string) => {
      let toggled: ScheduledCommand | undefined;
      setCommands((prevCommands) =>
        prevCommands.map((cmd) => {
          if (cmd.id !== commandId) return cmd;
          toggled = { ...cmd, enabled: !cmd.enabled };
          return toggled;
        }),
      );

      if (!toggled) return;

      await persistRaw(replaceRawCommand(rawRef.current, toggled));
    },
    [persistRaw],
  );

  return {
    commands,
    isLoading,
    addCommand,
    updateCommand,
    deleteCommand,
    toggleCommand,
    loadCommands,
  };
}
