import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import axios, { Axios, AxiosInstance } from "axios";

export const getApiClient = () => {
  const preferences = getPreferenceValues<Preferences>();
  const api = axios.create({
    baseURL: "https://api.nextdns.io",
  });
  api.defaults.headers.common["X-Api-Key"] = preferences.nextdns_api_key;
  api.defaults.headers.common["Content-Type"] = "application/json";
  return api;
};

export const getProfile = async () => {
  const api = getApiClient();
  const preferences = getPreferenceValues<Preferences>();
  const endpoint = "/profiles/" + preferences.nextdns_profile_id;

  const { data, status } = await api.get(endpoint);
  if (status !== 200 || !data) {
    return null;
  } else {
    return data.data;
  }
};

export const getProfileName = async () => {
  const preferences = getPreferenceValues<Preferences>();
  const cachedProfileName = await LocalStorage.getItem<string>(`profileName_${preferences.nextdns_profile_id}`);

  if (cachedProfileName) {
    return cachedProfileName;
  } else {
    const api = getApiClient();
    const preferences = getPreferenceValues<Preferences>();
    const endpoint = "/profiles/" + preferences.nextdns_profile_id;

    const { data, status } = await api.get(endpoint);
    if (status !== 200 || !data || !data.data.name) {
      return "Unknown";
    } else {
      const profileName = data.data.name;
      await LocalStorage.setItem(`profileName_${preferences.nextdns_profile_id}`, profileName);
      return profileName;
    }
  }
};
