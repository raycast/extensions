import axios from "axios";
import https from "https";
import { environment } from "@raycast/api";
const enableDebug = false;
const ignoreSSL = axios.create({
  proxy: {
    host: "127.0.0.1",
    port: 9090,
    protocol: "http",
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export function debugableAxios() {
  if (enableDebug && environment.isDevelopment) {
    return ignoreSSL;
  }
  return axios;
}
