import { getPreferenceValues } from "@raycast/api";
import { useCallback, useMemo } from "react";

import { createGroundcrewClient, type GroundcrewClient } from "./cli";
import { TaskBrowser } from "./components";
import type { LifecycleMutations } from "./components/lifecycle-actions";

export default function Command() {
  const { crewPath } = getPreferenceValues<Preferences>();
  const getClient = useMemo(() => {
    let clientPromise: Promise<GroundcrewClient> | undefined;
    return async () => {
      clientPromise ??= createGroundcrewClient({
        ...(crewPath?.trim() ? { executablePath: crewPath.trim() } : {}),
      });
      try {
        return await clientPromise;
      } catch (error) {
        clientPromise = undefined;
        throw error;
      }
    };
  }, [crewPath]);
  const loadTasks = useCallback(async () => (await getClient()).listTasks(), [getClient]);
  const loadTask = useCallback(async (taskId: string) => (await getClient()).getTask(taskId), [getClient]);
  const loadStatus = useCallback(async () => (await getClient()).getStatus(), [getClient]);
  const mutations = useMemo<LifecycleMutations>(
    () => ({
      startTask: async (taskId, options) => (await getClient()).startTask(taskId, options),
      stopTask: async (taskId, options) => (await getClient()).stopTask(taskId, options),
      resumeTask: async (taskId, options) => (await getClient()).resumeTask(taskId, options),
      cleanupTask: async (taskId, options) => (await getClient()).cleanupTask(taskId, options),
      completeTask: async (taskId, options) => (await getClient()).completeTask(taskId, options),
    }),
    [getClient],
  );

  return <TaskBrowser loadTasks={loadTasks} loadTask={loadTask} loadStatus={loadStatus} mutations={mutations} />;
}
