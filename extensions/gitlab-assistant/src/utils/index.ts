/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocalStorage, Toast, showHUD, showToast } from "@raycast/api";
import axios from "axios";

const API_VERSION = "/api/v4";

async function getUserConfig() {
  const userConfig = await LocalStorage.getItem("user_config");
  const config = JSON.parse(userConfig as string);
  const apiUrl = config.url + API_VERSION;

  const headers = {
    "Content-Type": "application/json",
    "PRIVATE-TOKEN": config.token,
  };
  return { ...JSON.parse(userConfig as string), headers, apiUrl };
}
// 通用的 GET 请求方法
async function get(path: string, params?: any) {
  try {
    const { apiUrl, headers } = await getUserConfig();
    const response = await axios.get(apiUrl + path, { params, headers: headers || {} });
    return response.data;
  } catch (error: any) {
    showHUD(error?.message ?? "未知错误");
    console.error("GET Request Error:", error);
    throw error;
  }
}

// 通用的 POST 请求方法
async function post(path: string, data: any) {
  try {
    const { apiUrl, headers } = await getUserConfig();
    const url = apiUrl + path;
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error: any) {
    showHUD(error?.message.includes(409) ? "😱MR已存在" : "未知错误");
    throw error;
  }
}

export { get, post, getUserConfig };
