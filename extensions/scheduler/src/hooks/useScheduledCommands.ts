import { useCallback } from "react";
import { showToast, Toast, confirmAlert, Alert, LocalStorage } from "@raycast/api";
import { ScheduledCommand } from "../types";
import { useLocalStorage } from "./useLocalStorage";

export function useScheduledCommands() {
  const [commands, setCommands, isLoading] = useLocalStorage<ScheduledCommand[]>("scheduledCommands", []);

  const addCommand = useCallback(
    async (command: ScheduledCommand) => {
      await setCommands((prevCommands) => [...prevCommands, command]);
    },
    [setCommands],
  );

  const updateCommand = useCallback(
    async (updatedCommand: ScheduledCommand) => {
      await setCommands((prevCommands) =>
        prevCommands.map((cmd) => (cmd.id === updatedCommand.id ? updatedCommand : cmd)),
      );
    },
    [setCommands],
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
        await setCommands((prevCommands) => prevCommands.filter((cmd) => cmd.id !== commandId));
        await showToast({
          style: Toast.Style.Success,
          title: "Command deleted",
          message: `"${command.name}" has been deleted`,
        });
      }
    },
    [commands, setCommands],
  );

  const toggleCommand = useCallback(
    async (commandId: string) => {
      await setCommands((prevCommands) =>
        prevCommands.map((cmd) => (cmd.id === commandId ? { ...cmd, enabled: !cmd.enabled } : cmd)),
      );
    },
    [setCommands],
  );

  const loadCommands = useCallback(async () => {
    // Force reload from LocalStorage by re-calling the load function
    try {
      const item = await LocalStorage.getItem<string>("scheduledCommands");
      if (item) {
        const parsedCommands = JSON.parse(item);
        setCommands(parsedCommands);
      }
    } catch (error) {
      console.error("Error reloading commands:", error);
    }
  }, [setCommands]);

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
