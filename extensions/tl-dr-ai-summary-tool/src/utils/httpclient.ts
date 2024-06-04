import axios from "axios";
import https from "https";
import { environment } from "@raycast/api";

const enableDebug = true; // 开发模式下设置为 true，生产模式下设置为 false

const ignoreSSL = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export function debugableAxios() {
  if (enableDebug && environment.isDevelopment) {
    return ignoreSSL;
  }
  return axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });
}