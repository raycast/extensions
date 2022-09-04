import Axios from "axios";
import { getToken, getProxy } from "../utils/preference";
import { Reply, Topic, TopicSource } from "./types";
import { Response } from "./interfaces";
import { showToast, Toast } from "@raycast/api";
const client = Axios.create({
  baseURL: "https://www.v2ex.com/api/",
  timeout: 10000,
});

// Add Token
client.interceptors.request.use(
  (config) => {
    if (!config.headers) {
      config.headers = {};
    }
    const token = getToken();
    token && (config.headers.Authorization = `Bearer ${token}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Add Proxy
client.interceptors.request.use(
  (config) => {
    const proxy = getProxy();
    config.proxy = proxy;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Show Toast
client.interceptors.response.use(
  (response) => {
    showToast({ title: "Success", style: Toast.Style.Success });
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      showToast({ title: "Timeout", message: "Please check the proxy settings", style: Toast.Style.Failure });
    }
    if (error.response) {
      if (error.response.status === 401) {
        showToast({
          title: "Error",
          message: error.response.data.message || "Please check the token setting",
          style: Toast.Style.Failure,
        });
      }
    }
    return error;
  }
);

const getTopics = async (source: TopicSource) => {
  showToast({ title: `Fetching Topics`, style: Toast.Style.Animated });
  const response = await client.get<Topic[]>(`/topics/${source}.json`);
  return response.data;
};
const getTopicReplies = async (topicId: number, signal?: AbortSignal) => {
  const token = getToken();
  if (!token) return;
  showToast({ title: "Fetching Replies", style: Toast.Style.Animated });
  const response = await client.get<Response<Reply[]>>(`/v2/topics/${topicId}/replies`, {
    signal: signal,
  });
  return response.data;
};
export { getTopics, getTopicReplies };
