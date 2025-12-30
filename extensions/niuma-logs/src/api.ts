import { getClient } from "node-cnb";
import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

let cachedClient: ReturnType<typeof getClient> | null = null;

function getApiDomain() {
  const { gitDomain: gitDomainPreference } = getPreferenceValues();
  return gitDomainPreference.replace("https://", "https://api.");
}

function getToken() {
  const { token } = getPreferenceValues();
  return token;
}

export function getApiClient() {
  if (cachedClient) return cachedClient;
  const apiDomain = getApiDomain();
  const token = getToken();
  cachedClient = getClient(apiDomain, token);
  return cachedClient;
}

// 生成一个 axios 实例，用来请求那些没有被封装到 node-cnb 里面的 API
let cachedAxiosInstance: ReturnType<typeof axios.create> | null = null;

export function getRawAxiosInstance() {
  if (cachedAxiosInstance) return cachedAxiosInstance;
  const apiDomain = getApiDomain();
  const token = getToken();
  cachedAxiosInstance = axios.create({
    baseURL: apiDomain,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return cachedAxiosInstance;
}
