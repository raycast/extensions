import { post } from "@/api/timecrowdClient";

export const startTask = async (teamId: number, taskId: number) => {
  return await post(`/api/v1/teams/${teamId}/tasks/${taskId}/start`);
};
