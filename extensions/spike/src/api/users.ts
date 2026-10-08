import apiClient from "./apiClient";
import { LocalStorage } from "@raycast/api";

/**
 * Fetches a list of favorites
 *
 * @returns {Promise<Object>} The response data containing the favorites.
 */
export const getFavorites = async () => {
  const response = await apiClient.get("/users/favorites");
  return response.data;
};

export const getUser = async () => {
  const user = await LocalStorage.getItem("user");
  if (user) {
    return JSON.parse(user as string);
  } else {
    const response = await apiClient.get("/users/me");
    LocalStorage.setItem("user", JSON.stringify(response.data));
    return response.data;
  }
};

export const getTeamsUsers = async () => {
  const response = await apiClient.get("/orgs/team/members");
  return response.data;
};

export default {
  getFavorites,
  getUser,
  getTeamsUsers,
};
