import { Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TimerForm } from "./components/timer-form";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { getHistory, listProjects, listTags, startTimer as persistStartTimer } from "./lib/timer-store";
import type { StartTimerPayload } from "./lib/timer-store";

export default function StartTimerCommand() {
  const [projects, setProjects] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const history = await getHistory();
      setProjects(listProjects(history));
      setTags(listTags(history));
    })();
  }, []);

  const handleCreate = async (payload: StartTimerPayload) => {
    try {
      const timer = await persistStartTimer(payload);
      await showToast({ style: Toast.Style.Success, title: "Timer started", message: timer.title });
      await refreshMenuBarCommand();
      await popToRoot();
    } catch (error) {
      const title =
        error instanceof Error && error.message === "ACTIVE_TIMER_EXISTS"
          ? "A timer is already running"
          : "Unable to start timer";
      await showToast({ style: Toast.Style.Failure, title });
    }
  };

  return <TimerForm onCreate={handleCreate} autoClose={false} projects={projects} tags={tags} />;
}
