import { Detail, type LaunchProps } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type GroundcrewClient } from "./cli";
import {
  findCanonicalTask,
  findLifecycleTask,
  naturalTaskId,
  useLifecycleActionController,
  type LifecycleMutations,
} from "./components/lifecycle-actions";
import { createGroundcrewClientFromPreferences } from "./create-client";

export default function Command(props: LaunchProps<{ arguments: Arguments.StartGroundcrewTask }>) {
  const rawInput = props.arguments.taskId.trim();
  const taskId = naturalTaskId(rawInput);

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

  const mutations = useMemo<LifecycleMutations>(
    () => ({
      startTask: async (id, options) => (await getClient()).startTask(id, options),
      stopTask: async (id, options) => (await getClient()).stopTask(id, options),
      resumeTask: async (id, options) => (await getClient()).resumeTask(id, options),
      cleanupTask: async (id, options) => (await getClient()).cleanupTask(id, options),
      completeTask: async (id, options) => (await getClient()).completeTask(id, options),
    }),
    [getClient],
  );

  const reconcile = useCallback(
    async (reconcileTaskId: string) => {
      try {
        const client = await getClient();
        const [tasksResult, statusResult] = await Promise.allSettled([client.listTasks(), client.getStatus()]);
        const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : undefined;
        const status = statusResult.status === "fulfilled" ? statusResult.value : undefined;
        return {
          taskRefreshed: tasks !== undefined,
          task: tasks !== undefined ? findCanonicalTask(tasks, reconcileTaskId) : undefined,
          statusRefreshed: status !== undefined,
          status: status !== undefined ? findLifecycleTask(status, reconcileTaskId, tasks) : undefined,
        };
      } catch {
        return { taskRefreshed: false, statusRefreshed: false };
      }
    },
    [getClient],
  );

  const controller = useLifecycleActionController({ mutations, reconcile });

  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void controller.run("start", taskId);
    }
  }, [controller, taskId]);

  return <Detail markdown={`## Starting Task\n\n\`${rawInput}\``} isLoading={controller.isMutating(taskId)} />;
}
