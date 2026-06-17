import apiClient from "./apiClient";

interface OncallOverride {
  user: string;
  oncall: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  desc?: string;
}

/**
 * Fetches a list of oncall schedules from the API.
 *
 * @param {number} [page=1] - The page number to retrieve.
 * @param {number} [perPage=20] - The number of schedules per page.
 * @returns {Promise<Object>} The response data containing the schedules.
 */
export const getSchedules = async (page = 1, perPage = 20) => {
  const response = await apiClient.get("/oncall/schedules", {
    params: { page, perPage },
  });
  return response.data;
};

/**
 * Fetches a list of active oncall schedules from the API.
 *
 * @param {number} [page=1] - The page number to retrieve.
 * @param {number} [perPage=20] - The number of schedules per page.
 * @returns {Promise<Object>} The response data containing the schedules.
 */

export const getActiveSchedules = async (page = 1, perPage = 20) => {
  const response = await apiClient.get("/oncall/all-active-on-call-shifts", {
    params: { page, perPage },
  });
  return response.data;
};

export const getMyOncalls = async (page = 1, perPage = 20) => {
  const response = await apiClient.get(`/oncall`, {
    params: { page, perPage, includes: "me" },
  });
  return response.data;
};

export const allOncalls = async (page = 1, perPage = 20) => {
  const response = await apiClient.get("/oncall/", {
    params: { page, perPage },
  });
  return response.data;
};

export const addOverride = async (data: OncallOverride) => {
  const response = await apiClient.post("/on-call/overrides" + `/${data.oncall}/add`, data);
  return response.data;
};

export const getOncall = async (id: string) => {
  const response = await apiClient.get(`/oncall/${id}`);
  return response.data;
};

export const getOncallSpectrum = async (id: string, data: object) => {
  const response = await apiClient.post(`/oncall/${id}/spectrum`, data);
  return response.data;
};

export const amIOncall = async () => {
  const response = await apiClient.get("/oncall-data");
  return response.data;
};

export const getWhoIsOncallNext = async (oncallId: string) => {
  const response = await apiClient.get(`/oncall/${oncallId}/who-is-on-call-next`);
  return response.data;
};

export default {
  getSchedules,
  getActiveSchedules,
  getMyOncalls,
  allOncalls,
  addOverride,
  getOncall,
  getOncallSpectrum,
  amIOncall,
  getWhoIsOncallNext,
};
