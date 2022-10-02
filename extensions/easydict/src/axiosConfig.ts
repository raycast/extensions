/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-02 15:47
 * @fileName: axiosConfig.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment, LocalStorage, showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import EventEmitter from "events";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getMacSystemProxy } from "mac-system-proxy";

EventEmitter.defaultMaxListeners = 15; // default is 10.

/**
 * * Note: this function should be called as early as possible.
 */
configDefaultAxios();

/**
 * Calculate axios request cost time.
 */
export const requestCostTime = "requestCostTime";

export let httpsAgent: HttpsProxyAgent | undefined;

/**
 * Becacuse get system proxy will block 0.4s, we need to get it after finish query.
 */
export const delayGetSystemProxyTime = 5000;

const systemProxyURLKey = "systemProxyURL";

/**
 * Delay get system proxy, every start app will get system proxy.
 */
export function delayGetSystemProxy() {
  setTimeout(() => {
    getSystemProxyURL();
  }, delayGetSystemProxyTime);
}

/**
 * Config default axios: timeout, interceptors.
 */
function configDefaultAxios() {
  console.log(`configDefaultAxios`);

  // Set axios timeout to 15s, since we start a loading when request is sent, we need to cancel it when timeout.
  axios.defaults.timeout = 15000;

  const requestStartTime = "request-startTime";

  axios.interceptors.request.use(function (config: AxiosRequestConfig) {
    if (config.headers) {
      config.headers[requestStartTime] = new Date().getTime();
    }
    return config;
  });
  axios.interceptors.response.use(function (response) {
    if (response.config.headers) {
      const startTime = response.config.headers[requestStartTime] as number;
      const endTime = new Date().getTime();
      response.headers[requestCostTime] = (endTime - startTime).toString();
    }
    return response;
  });
}

/**
 * Config axios default proxy.
 *
 * * Since directly use system proxy will block thread, we try to get proxy url from local storage first.
 */
export function configAxiosProxy(): Promise<void> {
  console.log(`---> configAxiosProxy`);

  return new Promise((resolve) => {
    getProxyURL()
      .then((proxyURL) => {
        configAxiosAgent(proxyURL);
        resolve();
      })
      .catch((error) => {
        const errorString = JSON.stringify(error) || "";
        console.error(`---> configAxiosProxy error: ${errorString}`);
        showToast({
          style: Toast.Style.Failure,
          title: `Config proxy error`,
          message: errorString,
        });
        resolve();
      });
  });
}

/**
 * Config axios agent with proxy url.
 */
export function configAxiosAgent(proxyURL: string | undefined): void {
  console.log(`---> configAxiosAgent: ${proxyURL}`);
  if (!proxyURL) {
    axios.defaults.httpsAgent = undefined;
    return;
  }

  const httpsAgent = new HttpsProxyAgent(proxyURL);
  axios.defaults.httpsAgent = httpsAgent;
}

/**
 * Get system proxy URL, and save it to local storage.
 *
 * * Note: get system proxy can block ~0.4s, so should call it at the right time.
 */
export function getSystemProxyURL(): Promise<string | undefined> {
  console.warn(`---> start getSystemProxyURL`);

  return new Promise((resolve, reject) => {
    /**
     * * Note: need to set env.PATH manually, otherwise will get error: "Error: spawn scutil ENOENT"
     * Detail:  https://github.com/httptoolkit/mac-system-proxy/issues/1
     */

    const env = process.env;
    // Raycast default "PATH": "/usr/bin:undefined"
    // console.log(`---> env: ${JSON.stringify(env, null, 2)}`);

    // env.PATH = "/usr/sbin"; // $ where scutil
    env.PATH = "/usr/sbin:/usr/bin:/bin:/sbin";
    // console.log(`---> env: ${JSON.stringify(env, null, 2)}`);

    if (environment.isDevelopment) {
      /**
       * handle error: unable to verify the first certificate.
       *
       * Ref: https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs
       */
      // env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    }

    // Remove previous system proxy URL.
    LocalStorage.removeItem(systemProxyURLKey);

    const startTime = Date.now();

    // * This function is sync and will block ~0.4s, even it's a promise.
    getMacSystemProxy()
      .then((systemProxy) => {
        // console.log(`---> get system proxy: ${JSON.stringify(systemProxy, null, 2)}`);
        if (!systemProxy.HTTPEnable || !systemProxy.HTTPProxy) {
          console.log(`---> no system http proxy`);
          return resolve(undefined);
        }

        const proxyURL = `http://${systemProxy.HTTPProxy}:${systemProxy.HTTPPort}`;
        console.warn(`---> get system proxy url: ${proxyURL}`);
        console.log(`get system proxy cost: ${Date.now() - startTime} ms`);
        LocalStorage.setItem(systemProxyURLKey, proxyURL);
        resolve(proxyURL);
      })
      .catch((err) => {
        // console.error(`---> get system proxy error: ${JSON.stringify(err, null, 2)}`);
        reject(err);
      })
      .finally(() => {
        // ! need to reset env.PATH, otherwise, will throw error: '/bin/sh: osascript: command not found'
        delete env.PATH; // env.PATH = "/usr/sbin:/usr/bin:/bin:/sbin";
      });
  });
}

/**
 * Get proxy agent.
 *
 * * Since translate.google.cn is not available anymore, we have to try to use proxy by default.
 *
 * * Note: this function will block ~0.4s, so should call it at the right time.
 */
export function getProxyAgent(): Promise<HttpsProxyAgent | undefined> {
  console.log(`---> start getProxyAgent`);

  if (httpsAgent) {
    console.log(`---> return cached httpsAgent`);
    return Promise.resolve(httpsAgent);
  }

  return new Promise((resolve) => {
    console.log(`---> getProxyAgent`);

    getProxyURL()
      .then((systemProxyURL) => {
        if (!systemProxyURL) {
          console.log(`---> no system proxy url, use direct agent`);
          return resolve(undefined);
        }

        console.log(`---> get system proxy url: ${systemProxyURL}`);
        const agent = new HttpsProxyAgent(systemProxyURL);
        httpsAgent = agent;
        resolve(agent);
      })
      .catch((error) => {
        console.error(`---> get system proxy url error: ${error}`);
        httpsAgent = undefined;
        resolve(undefined);
      });
  });
}

/**
 * Get proxy url from local storage first. If not exist, get it from system.
 */
export async function getProxyURL(): Promise<string | undefined> {
  console.log(`start getStoredProxyURL`);

  const systemProxyURL = await LocalStorage.getItem<string>(systemProxyURLKey);
  if (systemProxyURL) {
    console.log(`---> get Stored Proxy URL: ${systemProxyURL}`);
    return systemProxyURL;
  }

  console.log(`---> getProxyURL: undefined`);

  return new Promise((resolve) => {
    getSystemProxyURL()
      .then((proxyURL) => {
        resolve(proxyURL);
      })
      .catch((error) => {
        const errorString = JSON.stringify(error) || "";
        console.error(`---> getProxyURL error: ${errorString}`);
        resolve(undefined);
      });
  });
}
