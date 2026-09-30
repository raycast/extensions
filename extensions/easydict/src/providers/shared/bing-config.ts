/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Cache } from "@raycast/api";

import { myPreferences, userAgent } from "@/consts";
import { timedFetch } from "@/utils/http";
import { logTrace, logWarn } from "@/utils/logger";

interface BingConfig {
  IG: string;
  IID: string;
  key: string;
  token: string;
  expirationInterval: string;
  count: number;
}

const bingConfigKey = "BingConfig";
const defaultBingHost = "www.bing.com";

let bingHost: string = myPreferences.bingHost || defaultBingHost;
let bingConfig: BingConfig | undefined;
let bingConfigRequest: Promise<BingConfig | undefined> | undefined;

const cache = new Cache();

export function getBingHost(): string {
  return bingHost;
}

export function incrementBingConfigCount(): string {
  if (!bingConfig) throw new Error("Bing config not initialized");
  const requestCount = bingConfig.count + 1;
  bingConfig.count = requestCount;
  cache.set(bingConfigKey, JSON.stringify(bingConfig));
  return `${bingConfig.IID}.${requestCount}`;
}

function parseBingConfig(html: string): BingConfig | undefined {
  const IG = html.match(/IG:"(.*?)"/)?.[1];
  const IID = html.match(/data-iid="(.*?)"/)?.[1];
  const params_AbusePreventionHelper = html.match(/var params_AbusePreventionHelper = (.*?);/)?.[1];

  if (IG && params_AbusePreventionHelper) {
    const paramsArray = JSON.parse(params_AbusePreventionHelper);
    const [key, token, expirationInterval] = paramsArray;
    const config: BingConfig = {
      IG,
      IID: IID || "translator.5023",
      key,
      token,
      expirationInterval,
      count: 1,
    };
    bingConfig = config;
    cache.set(bingConfigKey, JSON.stringify(config));
    return config;
  }
}

async function fetchBingConfig(depth = 0): Promise<BingConfig | undefined> {
  if (depth >= 2) {
    logWarn("Bing", `requestBingConfig recursion depth limit reached (${depth})`);
    return undefined;
  }
  logTrace("Bing", "start requestBingConfig");
  logTrace("Bing", `config bingHost: ${bingHost}`);

  const url = `https://${bingHost}/translator`;
  const response = await timedFetch.raw(url, {
    headers: { "User-Agent": userAgent },
    responseType: "text",
  });

  const html = response._data as string;
  const config = parseBingConfig(html);

  if (config) {
    bingConfig = config;
    logTrace("Bing", `getBingConfig from web, IG: ${config.IG}`);
    cache.set(bingConfigKey, JSON.stringify(config));
    return config;
  }

  logWarn("Bing", `parse config failed, html: ${html}`);
  const finalUrl = response.url;
  bingHost = new URL(finalUrl).host;
  logWarn("Bing", `get config failed, host: ${bingHost}, change host, then request again`);
  try {
    return await fetchBingConfig(depth + 1);
  } catch {
    return undefined;
  }
}

export async function requestBingConfig(): Promise<BingConfig | undefined> {
  if (bingConfigRequest) {
    logTrace("Bing", "reuse in-flight config request");
    return bingConfigRequest;
  }

  const request = fetchBingConfig();
  bingConfigRequest = request;

  try {
    return await request;
  } finally {
    if (bingConfigRequest === request) {
      bingConfigRequest = undefined;
    }
  }
}

/**
 * Checks if the cached Bing token is expired, and performs a background refresh if it's halfway to expiration.
 */
function checkIfBingTokenExpired(): boolean {
  logTrace("Bing", "check if token expired");
  const value = cache.get(bingConfigKey);

  if (!value) {
    return true;
  }

  const config = JSON.parse(value) as BingConfig;
  const { key, expirationInterval } = config;
  const tokenStartTime = parseInt(key);
  const expiration = parseInt(expirationInterval);
  const tokenUsedTime = Date.now() - tokenStartTime;

  const isExpired = tokenUsedTime > expiration;

  if (!isExpired) {
    bingConfig = config;
    // Preemptive background refresh for better experience
    if (tokenUsedTime > expiration / 2) {
      logTrace("Bing", "token halfway to expiration, triggering background refresh");
      requestBingConfig().catch((e) => logWarn("Bing", `Background refresh failed: ${e}`));
    }
  }

  return isExpired;
}

export async function ensureBingConfig(): Promise<BingConfig> {
  const isExpired = checkIfBingTokenExpired();
  logTrace("Bing", `token expired: ${isExpired}`);

  if (isExpired || !bingConfig) {
    logTrace("Bing", "token expired or missing, request new one");
    bingConfig = await requestBingConfig();
  } else {
    logTrace("Bing", `use stored bingConfig, IG: ${bingConfig.IG}`);
  }

  if (!bingConfig) {
    throw new Error("Bing: failed to get config");
  }

  return bingConfig;
}
