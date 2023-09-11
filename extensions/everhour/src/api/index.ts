/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from "node-fetch";
import { preferences } from "@raycast/api";
import { Project, Task, TaskTimerResp, TaskStopTimerResp, TaskResp, CurrentTimerResp, TimeRecordResp } from "../types";

const API_KEY = preferences.token.value as string;

const headers = {
  "X-Api-Key": API_KEY,
  "Content-Type": "application/json",
};

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const getCurrentUser = async () => {
  const response = await fetch("https://api.everhour.com/users/me", {
    headers,
  });

  return (await response.json()) as any;
};

export const getRecentTasks = async (userId = "me"): Promise<Task[]> => {
  const [currentDate] = daysAgo(7).toISOString().split("T");
  const response = await fetch(`https://api.everhour.com/users/${userId}/time?limit=1000&from=${currentDate}`, {
    headers,
  });

  const timeRecords = (await response.json()) as any;

  if (timeRecords.code || timeRecords.length == 0) {
    throw new Error("No recent tasks.");
  }

  const aggregatedTasks = timeRecords.reduce((agg: { [key: string]: Task }, { time, task }: TimeRecordResp) => {
    const { id, name, projects, time: taskTime } = task;
    const { total = 0 } = taskTime;
    if (!agg[id]) {
      agg[id] = { id, name, projects, time: { total, recent: time } };
    } else {
      agg[id].time.recent += time;
    }
    return agg;
  }, {});

  return Object.values(aggregatedTasks);
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await fetch("https://api.everhour.com/projects?limit=1000&query=", {
    headers,
  });
  const projects = (await response.json()) as any;

  if (projects.code) {
    throw new Error(projects.message);
  }

  return projects.map(({ id, name }: Project) => ({
    id,
    name,
  }));
};

export const getTasks = async (projectId: string): Promise<Task[]> => {
  const response = await fetch(
    `https://api.everhour.com/projects/${projectId}/tasks?page=1&limit=250&excludeClosed=true&query=`,
    {
      headers,
    }
  );
  const tasks = (await response.json()) as any;

  if (tasks.code) {
    throw new Error(tasks.message);
  }

  return tasks.map(({ id, name }: TaskResp) => ({ id, name }));
};

export const getCurrentTimer = async (): Promise<string | null> => {
  const response = await fetch("https://api.everhour.com/timers/current", {
    headers,
  });
  const currentTimer = (await response.json()) as CurrentTimerResp;

  if (currentTimer.status === "stopped") {
    return null;
  }

  return currentTimer.task.id;
};

export const startTaskTimer = async (taskId: string): Promise<{ status: string; taskName: string }> => {
  const response = await fetch("https://api.everhour.com/timers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      task: taskId,
    }),
  });
  const respJson = (await response.json()) as TaskTimerResp;

  return {
    status: respJson.status,
    taskName: respJson.task.name,
  };
};

export const stopCurrentTaskTimer = async (): Promise<{ status: string; taskName: string }> => {
  const response = await fetch("https://api.everhour.com/timers/current", {
    method: "DELETE",
    headers,
  });
  const respJson = (await response.json()) as TaskStopTimerResp;

  return {
    status: respJson.status,
    taskName: respJson.taskTime?.task?.name,
  };
};

export const submitTaskHours = async (taskId: string, hours: string): Promise<{ taskName: string }> => {
  const seconds = parseFloat(hours) * 60 * 60;

  const response = await fetch(`https://api.everhour.com/tasks/${taskId}/time`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      time: seconds,
      date: new Date().toISOString().split("T")[0],
    }),
  });
  const respJson = (await response.json()) as TaskTimerResp;

  return {
    taskName: respJson.task?.name,
  };
};
