import { getPreferenceValues } from "@raycast/api";
import { useCallback, useMemo } from "react";

import { createGroundcrewClient, type GroundcrewClient } from "./cli";
import { StatusDashboard } from "./components";
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
