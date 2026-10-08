import { get } from "@/api/timecrowdClient";
import { Category } from "@/api";

export interface User {
  id: number;
  time_entry: {
    id: number;
    started_at: string;
    duration: number;
    category: Category;
    task: {
      id: number;
      title: string;
      team_id: number;
    };
    team: {
      name: string;
    };
  };
}

export const getUser = async (): Promise<User> => {
  return await get<User>("/api/v2/user");
};
