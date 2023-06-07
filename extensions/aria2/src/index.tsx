import { useState, useEffect } from "react";
import Aria2 from "aria2";
import ws from "ws";
import nodefetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, Task } from "./types";
import { formatTasks, getTaskIcon } from "./utils/utils";
import { List } from "@raycast/api";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);

  // 在 useEffect 钩子中获取任务数据并更新 tasks 状态
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

        // 初始化获取一次活动任务
        await fetchAndUpdateTasks();

        // 每隔一定时间获取活动任务并更新状态
        const interval = setInterval(fetchAndUpdateTasks, 1000);

        // 在组件卸载时清除定时器
        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error("Failed to connect to aria2 server:", error);
      }
    }

    fetchTasks();
  }, []);

  return (
    <List>
      {tasks.map((task) => {
        const accessories = [];
        if (task.status === "active" && task.progress !== "100.00%") {
          accessories.push(
            { tooltip: "Download Speed", text: ` ${task.downloadSpeed}`, icon: "🚀" },
            { tooltip: "Remaining Time", text: `${task.remainingTime}`, icon: "🕐" }
          );
        }

        accessories.push({ tooltip: "Progress", text: ` ${task.progress}`, icon: "⏳" });

        return (
          <List.Item
            icon={getTaskIcon(task.status)}
            key={task.gid}
            id={task.gid}
            title={{
              tooltip: "Task Name",
              value: task.fileName,
            }}
            subtitle={{ tooltip: "File Size", value: `💾${task.fileSize}` }}
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
