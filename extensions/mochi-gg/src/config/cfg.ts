// application public configuration

// import { environment } from "@raycast/api";
import axios from "axios";

export const MOCHI_PROXY_ENDPOINT = "https://mochi-extension-render.vercel.app";

axios.interceptors.request.use((config) => {
  console.log("[REQUEST]", config.url);
  return config;
});

axios.interceptors.response.use((response) => {
  if (response.status !== 200) {
    console.log("[RESPONSE ERROR]", response.config.url);
  }
  return response;
});
