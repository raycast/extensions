import { useState, useEffect } from "react";
import Aria2 from "aria2";
import ws from "ws";
import nodefetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, Task } from "./types";
import { formatTasks } from "./utils/utils";
import { TasksList } from "./components";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    async function fetchTasks() {
      const options = getPreferenceValues<Preferences>();
      const aria2 = new Aria2({ WebSocket: ws, fetch: nodefetch, ...options });
      try {
        await aria2.open();
        console.log("Connection to aria2 server is open");
        const fetchAndUpdateTasks = async () => {
          const activeTaskResponse = await aria2.call("tellActive");
          const waitingTaskResponse = await aria2.call("tellWaiting", 0, 99);
          const stoppedTaskResponse = await aria2.call("tellStopped", 0, 99);
          const activeTasks = formatTasks(activeTaskResponse);
          const waitingTasks = formatTasks(waitingTaskResponse);
          const stoppedTasks = formatTasks(stoppedTaskResponse);

          const updatedTasks: Task[] = [...activeTasks, ...waitingTasks, ...stoppedTasks];
          setTasks(updatedTasks);
        };
        await fetchAndUpdateTasks();
        const interval = setInterval(fetchAndUpdateTasks, 1000);
        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error("Failed to connect to aria2 server:", error);
      }
    }

    fetchTasks();
  }, []);

  return <TasksList tasks={tasks} />;
}
