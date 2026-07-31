import { useEffect, useRef, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { tasktick } from "../lib/tasktick";
import { sortTasks } from "../lib/sort-tasks";
import { EventsStream } from "../lib/events";
import type { Task } from "../lib/types";

const POST_ACTION_REFRESH_MS = 2000;

async function fetchTasks(cliPath: string): Promise<Task[]> {
  return sortTasks(await tasktick.list(cliPath));
}

export function useTasktickTasks(cliPath: string) {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    fetchTasks,
    [cliPath],
    {
      failureToastOptions: { title: "Failed to load tasks" },
    },
  );

  const tasks = data ?? [];

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const stream = new EventsStream(cliPath);

    stream.on("started", ({ id }) => {
      void mutate(Promise.resolve(), {
        optimisticUpdate: (list) =>
          (list ?? []).map((t) =>
            t.id === id ? { ...t, status: "running" } : t,
          ),
        shouldRevalidateAfter: false,
      });
    });

    stream.on("completed", ({ id, exitCode }) => {
      void mutate(Promise.resolve(), {
        optimisticUpdate: (list) =>
          (list ?? []).map((t) =>
            t.id === id ? { ...t, status: "idle", lastExitCode: exitCode } : t,
          ),
        shouldRevalidateAfter: false,
      });
    });

    stream.on("error", (err) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Events stream error",
        message: err.message,
      });
    });

    return () => stream.kill();
  }, [cliPath, mutate]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      revalidate();
    }, POST_ACTION_REFRESH_MS);
  }, [revalidate]);

  /** Explicit refresh (⌘⇧R) — toast feedback; background revalidates stay silent. */
  const refreshList = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing…",
    });
    try {
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }, [revalidate]);

  return {
    tasks,
    isLoading: isLoading && data === undefined,
    refreshList,
    scheduleRefresh,
  };
}
