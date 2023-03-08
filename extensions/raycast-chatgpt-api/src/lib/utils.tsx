import axios from "axios";
import { getPreferenceValues, Cache } from "@raycast/api";

interface Preferences {
  api_key: string;
  proxy_url: string;
  gpt_model: string;
}

const cacheName = "history";
const defaultHost = "https://api.openai.com";
const defaultModel = "gpt-3.5-turbo";

/**
 * Date Formatting
 * @param timestamp
 * @returns
 */
export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
  const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
  const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
  return `${month}/${day} ${hours}:${minutes}`;
};

/**
 * Public API invocation method.
 * @param content
 * @returns
 */
export const invokeChatGPT = (message: { role: string; content: string }[]) => {
  // Private parameter configuration.
  const preferences = getPreferenceValues<Preferences>();
  const api_key = preferences.api_key;
  const proxy_url = preferences.proxy_url;
  const gpt_model = preferences.gpt_model;

  const api_host = proxy_url || defaultHost;
  const gptModel = gpt_model || defaultModel;

  const data = {
    model: `${gptModel}`,
    messages: message,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${api_key}`,
  };

  return axios({
    method: "post",
    url: `${api_host}/v1/chat/completions`,
    headers,
    data: JSON.stringify(data),
    timeout: 30000,
  });
};

/**
 * Save browsing history.
 * @param type
 * @param data
 */
export const saveHistory = (type: string, question: string, data: any) => {
  const cache = new Cache();
  try {
    const { created, model, usage, choices } = data;
    const cData = {
      created: created,
      model: model,
      type: type,
      question: question,
      answer: choices[0].message.content,
      token: usage.total_tokens,
    };

    const oList = cache.get(cacheName);
    const list = oList ? JSON.parse(oList) : [];
    list.unshift(cData);

    // Maximum of 100 historical records can be saved.
    const maxLength = 100;
    if (list.length > maxLength) {
      list.splice(maxLength, list.length - maxLength);
    }

    cache.set(cacheName, JSON.stringify(list));
  } catch (e) {
    // ingore
  }
};

/**
 * Delete browsing history.
 * @param created
 */
export const clearHistoryItem = (created: number) => {
  const cache = new Cache();
  const oList = cache.get(cacheName);
  const list = oList ? JSON.parse(oList) : [];

  const idx = list.findIndex((item: any) => item.created === created);
  list.splice(idx, 1);

  cache.set(cacheName, JSON.stringify(list));
};
