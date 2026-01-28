import axios from "axios";
import { preferences, AUTH_URL, API_BASE_URL } from "../preferences";
import { APIResponse } from "./types";

export const fetchToken = async () => {
  const { username, password } = preferences;
  const response = await axios.post(AUTH_URL, { username, password });
  return response.data.data.token;
};

export const fetchData = async (token: string, path: string) => {
  const response = await axios.post<APIResponse>(
    `${API_BASE_URL}/list`,
    { path, password: "", page: 1, per_page: 0, refresh: false },
    { headers: { Authorization: token, "Content-Type": "application/json" } },
  );
  return response.data.data.content;
};

export const fetchFileDetails = async (token: string, path: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/get`,
    { path, password: "", page: 1, per_page: 0, refresh: false },
    { headers: { Authorization: token, "Content-Type": "application/json" } },
  );
  return response.data.data;
};

export const searchFiles = async (token: string, query: string, currentPath: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/search`,
    { parent: currentPath, keywords: query, page: 1, per_page: 10, scope: 0, password: "" },
    { headers: { Authorization: token, "Content-Type": "application/json" } },
  );
  return response.data.data.content;
};
