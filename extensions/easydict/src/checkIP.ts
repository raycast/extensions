/*
 * @author: tisfeng
 * @createTime: 2022-09-17 22:22
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-27 23:25
 * @fileName: checkIP.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios from "axios";
import { requestCostTime } from "./axiosConfig";
import { isChineseIPKey } from "./consts";
import { myDecrypt } from "./preferences";

/**
 * Check if ip is in China. If error, default is true.
 *
 * If request is successful, store value in LocalStorage.
 */
export function checkIfIpInChina(): Promise<boolean> {
  console.log(`check if ip in China`);

  return new Promise((resolve) => {
    getCurrentIpInfo()
      .then((ipInfo) => {
        const country = ipInfo.country;
        const isChina = country === "CN";
        LocalStorage.setItem(isChineseIPKey, isChina);
        console.warn(`---> ip country: ${country}`);
        resolve(isChina);
      })
      .catch((error) => {
        console.error(`checkIfIpInChina error: ${error}`);
        resolve(true);
      });
  });
}

/**
 * Get current ip info.
 * 
 * Ref: https://ipinfo.io/developers
 * 
 * * Note: Free usage of our API is limited to 50,000 API requests per month. If you exceed that limit, we'll return a 429 HTTP status code to you.
 * 
 * curl https://ipinfo.io
  {
    "ip": "120.240.53.42",
    "city": "Zhanjiang",
    "region": "Guangdong",
    "country": "CN",
    "loc": "21.2339,110.3875",
    "org": "AS9808 China Mobile Communications Group Co., Ltd.",
    "timezone": "Asia/Shanghai",
    "readme": "https://ipinfo.io/missingauth"
  }
 */
async function getCurrentIpInfo() {
  try {
    const token = myDecrypt("U2FsdGVkX1+sExqLZVqT0q3vOVDXqul2TMJeiD9aJRk=");
    const url = `https://ipinfo.io/?token=${token}`;
    const res = await axios.get(url);
    console.log(`---> ip info: ${JSON.stringify(res.data, null, 4)}, cost ${res.headers[requestCostTime]} ms`);
    return Promise.resolve(res.data);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}

/**
 * Get current ip address, return 114.37.203.235.
 *
 * Ref: https://blog.csdn.net/uikoo9/article/details/113820051
 */
export async function getCurrentIp(): Promise<string> {
  const url = "http://icanhazip.com/";
  try {
    const res = await axios.get(url);
    const ip = res.data.trim();
    console.warn(`---> current ip: ${ip}, cost ${res.headers["requestCostTime"]} ms`);
    return Promise.resolve(ip);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}
