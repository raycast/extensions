import { get, post } from "./index";

export const getProjects = async (userId: string) => {
  const data = await get(`/users/${userId}/contributed_projects`);
  return data;
};

export const getCommits = async () => {
  const data = await get("/commits");
  return data;
};

export const getBranches = async (id: string) => {
  const data = await get(`/projects/${id}/repository/branches`);
  return data;
};

export const createMr = async (params: any) => {
  const projectId = params?.id;
  const requestData = params.data;
  const data = await post(`/projects/${projectId}/merge_requests`, requestData);
  return data;
};

export const getCurrentUser = async () => {
  const data = await get("/user");
  return data;
};

export const getFirstCommit = async ({ id, branch }: { id: string; branch: string }) => {
  const data = await get(`/projects/${id}/repository/commits?ref_name=${branch}&per_page=1`);
  return data;
};

export const getUserEvent = async (params: any) => {
  const data = await get(`/events`, params);
  return data;
};
