import { getClient } from "node-cnb";
import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

function getApiDomain() {
  const { gitDomain: gitDomainPreference } = getPreferenceValues();
  return gitDomainPreference.replace("https://", "https://api.");
}

function getToken() {
  const { token } = getPreferenceValues();
  return token;
}

export function getApiClient() {
  const apiDomain = getApiDomain();
  const token = getToken();
  return getClient(apiDomain, token);
}

// Axios instance for APIs not wrapped by node-cnb.
export function getRawAxiosInstance() {
  const apiDomain = getApiDomain();
  const token = getToken();
  return axios.create({
    baseURL: apiDomain,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
