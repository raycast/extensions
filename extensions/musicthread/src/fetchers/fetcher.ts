import axios from "axios";

export const createMusicThreadApiAxiosInstance = (personalAccessToken?: string) => {
  const headers = {
    ...(personalAccessToken ? { Authorization: `Bearer ${personalAccessToken}` } : {}),
    "Content-Type": "application/json; charset=utf-8",
  };

  const axiosInstance = axios.create({
    baseURL: "https://musicthread.app/api/v0/",
    headers,
  });

  return axiosInstance;
};
