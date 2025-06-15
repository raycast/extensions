import apiClient from "./apiClient";

export const getTeams = async (page = 1, perPage = 20) => {
  const response = await apiClient.get("/teams", {
    params: { page, perPage },
  });
  return response.data;
};

export const getTeam = async (teamId: string) => {
  const response = await apiClient.get(`/teams/${teamId}`);
  return response.data;
};

export default {
  getTeams,
  getTeam,
};
