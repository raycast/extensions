import { request } from "./request";

export type TaskInfo = {
  id: string;
  name: string;
  url?: string;
  projects?: string[];
  time?: {
    total?: number;
    users?: Record<string, number>;
  };
  estimate?: {
    total?: number;
    type?: string;
    users?: Record<string, number>;
  };
};

export type TimeEntry = {
  id: number;
  date: string;
  time: number;
  user: number;
  task?: TaskInfo;
  comment?: string;
};

export async function getTeamTime(from: string, to: string) {
  const { data } = await request<TimeEntry[]>("/team/time", {
    params: { from, to },
  });
  return data;
}
