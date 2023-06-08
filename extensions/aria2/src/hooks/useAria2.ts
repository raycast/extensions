import { useState, useEffect, useCallback } from "react";
import Aria2, { Aria2Options, Notification } from "aria2";
import ws from "ws";
import nodefetch from "node-fetch";
import { Preferences, Task, Status } from "../types";
import { formatTasks } from "../utils/utils";
import { getPreferenceValues } from "@raycast/api";

type Aria2Client = {
  client: Aria2 | null;
  isConnected: boolean;
  fetchTasks: () => Promise<Task[]>;
  addDownloadTask: (url: string) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  pauseTask: (taskId: string) => Promise<void>;
  restartTask: (taskId: string) => Promise<void>;
  handleNotification: (callback: (notification: Notification) => void) => void;
};

const useAria2 = (): Aria2Client => {
  const [client, setClient] = useState<Aria2 | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectToAria2 = async () => {
      const options: Aria2Options = getPreferenceValues<Preferences>();
      const aria2 = new Aria2({ WebSocket: ws, fetch: nodefetch, ...options });

      try {
        await aria2.open();
        console.log("Connected to Aria2 server");
        setClient(aria2);
        setIsConnected(true);
      } catch (error) {
        console.error("Unable to connect to Aria2 server:", error);
      }
    };

    connectToAria2();

    return () => {
      if (client) {
        client.close();
        console.log("Disconnected from Aria2 server");
      }
    };
  }, []);

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    if (!client) {
      throw new Error("Aria2 client is not available");
    }

    try {
      const activeTaskResponse = await client.call("tellActive");
      const waitingTaskResponse = await client.call("tellWaiting", 0, 99);
      const stoppedTaskResponse = await client.call("tellStopped", 0, 99);

      const activeTasks = formatTasks(activeTaskResponse);
      const waitingTasks = formatTasks(waitingTaskResponse);
      const stoppedTasks = formatTasks(stoppedTaskResponse);

      return [...activeTasks, ...waitingTasks, ...stoppedTasks];
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      return [];
    }
  }, [client]);

  const addDownloadTask = useCallback(
    async (url: string): Promise<void> => {
      if (!client) {
        throw new Error("Aria2 client is not available");
      }

      try {
        // 判断 url 的类型
        const isTorrent = url.endsWith(".torrent");
        const isMetalink = url.endsWith(".metalink");

        if (isTorrent) {
          // 如果是 Torrent 文件，使用 addTorrent 方法添加任务
          await client.call("addTorrent", Buffer.from(url).toString("base64"));
          console.log("Added torrent download task:", url);
        } else if (isMetalink) {
          // 如果是 Metalink 文件，使用 addMetalink 方法添加任务
          await client.call("addMetalink", Buffer.from(url).toString("base64"));
          console.log("Added metalink download task:", url);
        } else {
          // 否则，使用 addUri 方法添加任务
          await client.call("addUri", [url]);
          console.log("Added download task:", url);
        }
      } catch (error) {
        console.error("Failed to add download task:", error);
      }
    },
    [client]
  );

  const removeTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!client) {
        throw new Error("Aria2 client is not available");
      }

      try {
        const taskStatus = await client.call("tellStatus", taskId);

        if (taskStatus.status === Status.Active) {
          // 任务正在进行中，使用 `forceRemove` 方法停止并删除任务
          await client.call("forceRemove", taskId);
        } else if (taskStatus.status === Status.Paused || taskStatus.status === Status.Waiting) {
          // 任务已暂停或正在等待中，使用 `remove` 方法删除任务
          await client.call("remove", taskId);
        } else {
          // 任务已完成或已停止，使用 `purgeDownloadResult` 方法彻底删除任务结果
          await client.call("removeDownloadResult", taskId);
        }

        console.log("Removed task:", taskId);
      } catch (error) {
        console.error("Failed to remove task:", error);
      }
    },
    [client]
  );

  const pauseTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!client) {
        throw new Error("Aria2 client is not available");
      }

      try {
        const taskStatus = await client.call("tellStatus", taskId);

        if (taskStatus.status === Status.Active) {
          // 只有当任务状态为 "active" 时，才执行暂停操作
          await client.call("pause", taskId);
          console.log("Paused task:", taskId);
        } else {
          console.log("Task is not active. Skipping pause operation.");
        }
      } catch (error) {
        console.error("Failed to pause task:", error);
      }
    },
    [client]
  );

  const restartTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!client) {
        throw new Error("Aria2 client is not available");
      }

      try {
        const taskStatus = await client.call("tellStatus", taskId);

        if (taskStatus.status === Status.Paused) {
          // 只有当任务状态为 "paused" 时，才执行重新启动操作
          await client.call("unpause", taskId);
          console.log("Restarted task:", taskId);
        } else {
          console.log("Task is not paused. Skipping restart operation.");
        }
      } catch (error) {
        console.error("Failed to restart task:", error);
      }
    },
    [client]
  );

  const handleNotification = useCallback(
    (callback: (notification: Notification) => void) => {
      if (!client) {
        throw new Error("Aria2 client is not available");
      }

      client.on("onDownloadStart", (event: Notification) => {
        callback(event);
      });

      client.on("onDownloadPause", (event: Notification) => {
        callback(event);
      });

      client.on("onDownloadStop", (event: Notification) => {
        callback(event);
      });

      client.on("onDownloadComplete", (event: Notification) => {
        callback(event);
      });

      client.on("onDownloadError", (event: Notification) => {
        callback(event);
      });

      client.on("onBtDownloadComplete", (event: Notification) => {
        callback(event);
      });
    },
    [client]
  );

  return {
    client,
    isConnected,
    fetchTasks,
    addDownloadTask,
    removeTask,
    pauseTask,
    restartTask,
    handleNotification,
  };
};

export default useAria2;
