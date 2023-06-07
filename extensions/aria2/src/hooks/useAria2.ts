import { useState, useEffect, useCallback } from "react";
import Aria2, { Aria2Options } from "aria2";
import ws from "ws";
import nodefetch from "node-fetch";
import { Preferences, Task } from "../types";
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
        await client.call("addUri", [url]);
        console.log("Added download task:", url);
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
        await client.call("remove", taskId);
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
        await client.call("pause", taskId);
        console.log("Paused task:", taskId);
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
        await client.call("unpause", taskId);
        console.log("Restart task:", taskId);
      } catch (error) {
        console.error("Failed to Restart task:", error);
      }
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
  };
};

export default useAria2;
