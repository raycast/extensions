import { useCallback, useMemo } from "react";

import { type GroundcrewClient } from "./cli";
import { StatusDashboard } from "./components";
import type { LifecycleMutations } from "./components/lifecycle-actions";
import { createGroundcrewClientFromPreferences } from "./create-client";

export default function Command() {
  const getClient = useMemo(() => {
    let clientPromise: Promise<GroundcrewClient> | undefined;
    return async () => {
      clientPromise ??= createGroundcrewClientFromPreferences();
      try {
        return await clientPromise;
      } catch (error) {
        clientPromise = undefined;
        throw error;
      }
    };
  }, []);
  const loadStatus = useCallback(async () => (await getClient()).getStatus(), [getClient]);
  const loadTasks = useCallback(async () => (await getClient()).listTasks(), [getClient]);
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
  const cleanupAllTasks = useCallback(
    async (options?: { force?: boolean }) => (await getClient()).cleanupAllTasks(options),
    [getClient],
  );

  return (
    <StatusDashboard
      loadStatus={loadStatus}
      loadTasks={loadTasks}
      mutations={mutations}
      cleanupAllTasks={cleanupAllTasks}
    />
  );
}
