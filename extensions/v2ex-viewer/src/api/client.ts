import Axios, { AxiosResponse } from "axios";
import { getToken, getProxy, hasToken } from "../utils/preference";
import { Notification, Reply, Topic, TopicSource } from "./types";
import { Response } from "./interfaces";
import { showToast, Toast } from "@raycast/api";
const client = Axios.create({
  baseURL: "https://www.v2ex.com/api/",
  timeout: 10000,
});

// Add Token
client.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }
  const token = getToken();
  token && (config.headers.Authorization = `Bearer ${token}`);
  return config;
});
// Add Proxy
client.interceptors.request.use((config) => {
  const proxy = getProxy();
  config.proxy = proxy;
  return config;
});
// Show Toast
client.interceptors.request.use(
  async (config) => {
    showToast({ title: "Fetching", message: config.url, style: Toast.Style.Animated });
    return config;
  },
  (error) => {
    showToast({ title: "Error", style: Toast.Style.Failure });
    return Promise.reject(error);
  }
);
client.interceptors.response.use(
  (response) => {
    showToast({ title: "Success", message: response.config.url, style: Toast.Style.Success });
    // console.log(`${response.status} - ${response.config.url}`);
    return response?.data.result || response?.data;
  },
  (error) => {
    // console.log(`${error.response?.status || error.code} - ${error.config?.url || error.message}`);
    if (error.response) {
      if (error.response.status === 401) {
        showToast({
          title: "Authentication",
          message: error.response.data.message,
          style: Toast.Style.Failure,
        });
      }
      return;
    }
    showToast({ title: error.code, message: error.message, style: Toast.Style.Failure });
    return;
  }
);
const getTopicsBySource = async (source: TopicSource) => {
  const response = await client.get<Topic[], Topic[]>(`/topics/${source}.json`);
  return response;
};
const getTopicReplies = async (topicId: number) => {
  const response = await client.get<Response<Reply[]>, Reply[]>(`/v2/topics/${topicId}/replies`);
  return response;
};
const getNotifications = async () => {
  const response = await client.get<Response<Notification[]>, Notification[]>(`/v2/notifications`);
  return response;
};
export { getTopicsBySource, getTopicReplies, getNotifications };
