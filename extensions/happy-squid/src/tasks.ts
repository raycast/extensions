import { Cache, environment, launchCommand, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createTaskClient, requestTasks } from "./client";
import { taskSubtitle } from "./format";
import type { TaskPageContext } from "./manage-tasks";
import { taskSnapshotCacheKey, writeCachedTaskSnapshot } from "./task-cache";

const refreshes = new Cache({ namespace: "task-subtitle" });

export default async function Tasks({
  launchContext,
}: {
  launchContext?: TaskPageContext & { subtitle?: string };
} = {}): Promise<void> {
  if (environment.launchType !== LaunchType.Background) {
    try {
      await launchCommand({ name: "manage-tasks", type: LaunchType.UserInitiated, context: launchContext });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Manage Tasks",
        message: String(error),
      });
    }
    return;
  }

  const revision = randomUUID();
  refreshes.set("revision", revision);
  const subtitle = launchContext?.subtitle ?? (await refreshTaskSnapshot(revision));
  // A page action or a newer refresh wins over an earlier network response.
  if (refreshes.get("revision") === revision) await updateCommandMetadata({ subtitle });
}

async function refreshTaskSnapshot(revision: string): Promise<string | null> {
  const client = createTaskClient();
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) return "Sign in to Happy Squid";

    const response = await requestTasks(client, {
      action: { kind: "snapshot" },
      expectedTaskId: null,
      expectedReviewId: null,
    });
    const receivedAt = Date.now();
    if (!response.snapshot) throw new Error("Task snapshot missing");

    const { data: current, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!current.session) return "Sign in to Happy Squid";
    if (current.session.user.id !== data.session.user.id) return null;
    if (refreshes.get("revision") !== revision) return null;
    await writeCachedTaskSnapshot(taskSnapshotCacheKey(current.session.user.id), response.snapshot, receivedAt);
    return taskSubtitle(response.snapshot, response.snapshot.capturedAt);
  } catch (error) {
    console.warn("[tasks] Could not refresh launcher subtitle", error);
    return null;
  } finally {
    await client.auth.stopAutoRefresh();
  }
}
