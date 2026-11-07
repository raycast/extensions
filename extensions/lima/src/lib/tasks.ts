import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Pending } from "./instance";

const VERBS: Record<Pending, string> = {
  Creating: "create",
  Starting: "start",
  Stopping: "stop",
  Restarting: "restart",
  Recreating: "recreate",
  Deleting: "delete",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs limactl work on an instance with a toast, and keeps what's running by instance name,
 * since starts and creates take a while and the row should say so until they're done.
 */
export function useTasks(onDone: () => void) {
  const [pending, setPending] = useState<Record<string, Pending>>({});

  /** True when it finished without an error. `note` shows under the toast while it runs. */
  async function run(name: string, state: Pending, task: () => Promise<void>, done: string, note?: string) {
    setPending((current) => ({ ...current, [name]: state }));
    const toast = await showToast({ style: Toast.Style.Animated, title: `${state} ${name}...`, message: note });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = `${done} ${name}`;
      toast.message = undefined;
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't ${VERBS[state]} ${name}`;
      toast.message = errorMessage(error);
      return false;
    } finally {
      setPending((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)));
      onDone();
    }
  }

  return { pending, run, busy: Object.keys(pending).length > 0 };
}
