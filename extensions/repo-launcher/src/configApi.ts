import { useCachedState } from "@raycast/utils";
import { nanoid } from "nanoid";

const CONFIG_KEYS = {
  CONTAINING_DIRECTORIES: "CONTAINING_DIRECTORIES",
  LAUNCH_COMMANDS: "LAUNCH_COMMANDS",
} as const;

export const useContainingDirectories = () => useCachedState<string[]>(CONFIG_KEYS.CONTAINING_DIRECTORIES, [])[0];

export const useAddContainingDirectory = () => {
  const [, setProjectsRoots] = useCachedState<string[]>(CONFIG_KEYS.CONTAINING_DIRECTORIES, []);

  return (dir: string) => {
    setProjectsRoots((prev) => [...new Set([...prev, dir])]);
  };
};

export const useRemoveContainingDirectory = () => {
  const [, setProjectsRoots] = useCachedState<string[]>(CONFIG_KEYS.CONTAINING_DIRECTORIES, []);

  return (dir: string) => {
    setProjectsRoots((prev) => prev.filter((p) => p !== dir));
  };
};

export type LaunchCommand = {
  id: string;
  title: string;
  command: string;
};

export const useLaunchCommands = () => useCachedState<LaunchCommand[]>(CONFIG_KEYS.LAUNCH_COMMANDS, [])[0];

export const useAddLaunchCommand = () => {
  const [, setLaunchCommands] = useCachedState<LaunchCommand[]>(CONFIG_KEYS.LAUNCH_COMMANDS, []);

  return (cmd: Omit<LaunchCommand, "id">) => {
    setLaunchCommands((prev) => [...prev, { ...cmd, id: nanoid() }]);
  };
};

export const useEditLaunchCommand = () => {
  const [, setLaunchCommands] = useCachedState<LaunchCommand[]>(CONFIG_KEYS.LAUNCH_COMMANDS, []);

  return (id: string, updatedCommand: Partial<LaunchCommand>) => {
    setLaunchCommands((prev) => {
      return [...prev].map((c) => (c.id === id ? { ...c, ...updatedCommand } : c));
    });
  };
};

export const useRemoveLaunchCommand = () => {
  const [, setLaunchCommands] = useCachedState<LaunchCommand[]>(CONFIG_KEYS.LAUNCH_COMMANDS, []);

  return (id: string) => {
    setLaunchCommands((prev) => prev.filter((cmd) => cmd.id !== id));
  };
};

export const useMoveLaunchCommand = () => {
  const [, setLaunchCommands] = useCachedState<LaunchCommand[]>(CONFIG_KEYS.LAUNCH_COMMANDS, []);

  return (cmd: LaunchCommand, direction: "up" | "down" | "top" | "bottom") => {
    setLaunchCommands((prev) => {
      const index = prev.findIndex((c) => c.command === cmd.command);
      const newIndex =
        direction === "up" ? index - 1 : direction === "down" ? index + 1 : direction === "top" ? 0 : prev.length - 1;
      const newCommands = [...prev];
      newCommands.splice(index, 1);
      newCommands.splice(newIndex, 0, cmd);
      return newCommands;
    });
  };
};
