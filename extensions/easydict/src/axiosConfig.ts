/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-17 16:02
 * @fileName: axiosConfig.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import { getMacSystemProxy } from "mac-system-proxy";
import { myPreferences } from "./preferences";

// Set axios timeout to 15s, since we start a loading when request is sent.
axios.defaults.timeout = 15000;

/**
 * Caclulate axios request cost time.
 */
export const requestCostTime = "requestCostTime";
axios.interceptors.request.use(function (config: AxiosRequestConfig) {
  if (config.headers) {
    config.headers["request-startTime"] = new Date().getTime();
  }
  return config;
});
axios.interceptors.response.use(function (response) {
  if (response.config.headers) {
    const startTime = response.config.headers["request-startTime"] as number;
    const endTime = new Date().getTime();
    response.headers[requestCostTime] = (endTime - startTime).toString();
  }
  return response;
});

/**
 * Check if need to use proxy. if yes, config axios proxy, if no, clear proxy config.
 */
export function configAxiosProxy() {
  if (myPreferences.enableSystemProxy) {
    /**
     * * Note: need to set env.PATH manually, otherwise will get error: "Error: spawn scutil ENOENT"
     * Detail:  https://github.com/httptoolkit/mac-system-proxy/issues/1
     */

    const env = process.env;
    // env.PATH = "/usr/sbin"; // $ where scutil
    env.PATH = "/usr/sbin:/usr/bin:/bin:/sbin";
    // console.log(`---> env: ${JSON.stringify(env, null, 2)}`);

    getMacSystemProxy()
      .then((systemProxy) => {
        if (systemProxy) {
          // console.log(`---> get system proxy: ${JSON.stringify(systemProxy, null, 2)}`);
          if (systemProxy.HTTPEnable) {
            const proxyOptions: HttpsProxyAgentOptions = {
              host: systemProxy.HTTPProxy,
              port: systemProxy.HTTPPort,
            };
            const httpsAgent = new HttpsProxyAgent(proxyOptions);
            axios.defaults.httpsAgent = httpsAgent;
            // set proxy to env, so we can use it in other modules.
            env.PROXY = `http://${systemProxy.HTTPProxy}:${systemProxy.HTTPPort}`;
            console.log(`---> use http system proxy: ${JSON.stringify(proxyOptions, null, 4)}`);
          }
        }
      })
      .catch((err) => {
        console.error(`---> get system proxy error: ${JSON.stringify(err, null, 2)}`);
        showToast({
          style: Toast.Style.Failure,
          title: `Get system proxy error`,
          message: `${JSON.stringify(err)}`,
        });
      })
      .finally(() => {
        // ! need to reset env.PATH, otherwise, will throw error: '/bin/sh: osascript: command not found'
        delete env.PATH; // env.PATH = "/usr/sbin:/usr/bin:/bin:/sbin";
      });
  } else {
    console.log("disable system proxy");
    axios.defaults.httpsAgent = undefined;
    delete process.env.PROXY;
  }
}
