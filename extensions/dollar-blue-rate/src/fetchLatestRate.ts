import fetch from "node-fetch";
import { Cache } from "@raycast/api";

export interface BlueRate {
  value_sell: number;
  date: string;
}

interface APIResponse {
  blue: {
    value_sell: number;
  };
  last_update: string;
}

const API_BASE_URL = "https://api.bluelytics.com.ar/v2";
const CACHE_KEY = "latestBlueRate";
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

const cache = new Cache();

export async function fetchLatestBlueRate(forceRefresh = false): Promise<BlueRate> {
  if (!forceRefresh) {
    const cachedData = cache.get(CACHE_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data;
      }
    }
  }

  const response = await fetch(`${API_BASE_URL}/latest`);
  const data = (await response.json()) as APIResponse;
  const latestRate: BlueRate = {
    value_sell: data.blue.value_sell,
    date: data.last_update,
  };

  cache.set(CACHE_KEY, JSON.stringify({ data: latestRate, timestamp: Date.now() }));

  return latestRate;
}
