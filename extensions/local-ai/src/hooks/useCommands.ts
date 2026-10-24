import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { AiCommand } from "../lib/commands/types";
import { loadCommands, saveCommands } from "../services/command-store";

export function useCommands() {
  const { data, isLoading, revalidate } = useCachedPromise(loadCommands);

  async function mutate(change: (current: AiCommand[]) => AiCommand[]): Promise<boolean> {
    if (data?.readOnly) {
      await showToast({ style: Toast.Style.Failure, title: "Commands are read-only", message: data.notice });
      return false;
    }
    const latest = await loadCommands();
    if (latest.readOnly) {
      await showToast({ style: Toast.Style.Failure, title: "Commands are read-only", message: latest.notice });
      return false;
    }
    try {
      await saveCommands(change(latest.commands));
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save commands",
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      revalidate();
    }
  }

  return {
    commands: data?.commands ?? [],
    isLoading,
    readOnly: data?.readOnly ?? false,
    notice: data?.notice,
    mutate,
  };
}
