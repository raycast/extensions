/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from "node-fetch";
import { preferences } from "@raycast/api";
import { Project, Task, TaskTimerResp, TaskStopTimerResp, TaskResp, CurrentTimerResp } from "../types";

const API_KEY = preferences.token.value as string;

const headers = {
  "X-Api-Key": API_KEY,
  "Content-Type": "application/json",
};

export const getCurrentUser = async () => {
  const response = await fetch("https://api.everhour.com/users/me", {
    headers,
  });

  return (await response.json()) as any;
};

export const getTimeRecords = async (userId: string | null) => {
  const [currentDate] = new Date().toISOString().split("T");
  const response = await fetch(`https://api.everhour.com/users/${userId}/time?limit=100&from=${currentDate}`, {
    headers,
  });

  const recordsJson = (await response.json()) as any;

  return recordsJson
    .map(({ task, time }: { task: any; time: number }) => {
      if (task) {
        return {
          id: task.id,
          name: task.name,
          timeInMin: time ? Math.round(time / 60) : 0,
          projectId: task.projects[0],
        };
      }
    })
    .filter(Boolean);
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await fetch("https://api.everhour.com/projects?limit=100&query=", {
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

  return tasks.map(({ id, name, time }: TaskResp) => ({
    id,
    name,
    timeInMin: time ? Math.round(time.total / 60) : 0,
  }));
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
