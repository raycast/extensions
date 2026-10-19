import { Icon, LaunchType, MenuBarExtra, Toast, launchCommand, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { endTask, extendTask, pauseTask, reconcileSession, resumeTask } from "./session";
import { remainingTime, shortTaskName, type TaskSession } from "./timer";

export default function Command() {
  const [session, setSession] = useState<TaskSession>();
  const [isLoading, setIsLoading] = useState(true);
  const [, setTick] = useState(0);

  const openStartTask = useCallback(async (task?: string, minutes?: string) => {
    await launchCommand({
      name: "start-task",
      type: LaunchType.UserInitiated,
      context: task && minutes ? { task, minutes } : undefined,
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await reconcileSession();
      setSession(result.session);
      if (result.completed) {
        const completed = result.completed;
        await showToast({
          style: Toast.Style.Success,
          title: "Task finished",
          message: completed.taskName,
          primaryAction: {
            title: "Start Again",
            onAction: () => openStartTask(completed.taskName, String(completed.durationMinutes)),
          },
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update task timer",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [openStartTask]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      setTick((value) => value + 1);
      void refresh();
    }, 1_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!session) {
    return isLoading ? <MenuBarExtra isLoading title="--:--" icon={Icon.Clock} /> : null;
  }

  const paused = session.status === "paused";
  const remaining = remainingTime(session);

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      isLoading={isLoading}
      title={`${paused ? "Ⅱ " : ""}${remaining}`}
      tooltip={`${session.taskName} · ${paused ? "Paused" : `${remaining} remaining`}`}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={shortTaskName(session.taskName)} subtitle={`${session.durationMinutes} min`} />
        <MenuBarExtra.Item title={paused ? "Paused" : `${remaining} Remaining`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={paused ? "Resume" : "Pause"}
          icon={paused ? Icon.Play : Icon.Pause}
          onAction={async () => setSession(paused ? await resumeTask() : await pauseTask())}
        />
        <MenuBarExtra.Submenu title="Extend…" icon={Icon.PlusCircle}>
          {[5, 10, 15].map((minutes) => (
            <MenuBarExtra.Item
              key={minutes}
              title={`${minutes} Minutes`}
              onAction={async () => setSession(await extendTask(minutes))}
            />
          ))}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          title="End Task"
          icon={Icon.Stop}
          onAction={async () => {
            const entry = await endTask();
            setSession(undefined);
            if (entry) await showToast({ style: Toast.Style.Success, title: "Task ended", message: entry.taskName });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Task History"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "task-history", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
