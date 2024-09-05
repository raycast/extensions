import fetch from "node-fetch";
import { Cache } from "@raycast/api";
import { BlueRate } from "./fetchLatestRate";

interface APIResponse {
  blue: {
    value_sell: number;
  };
}

const API_BASE_URL = "https://api.bluelytics.com.ar/v2";
const CACHE_PREFIX = "historicalBlueRate_";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const cache = new Cache();

export async function fetchHistoricalBlueRate(date: string): Promise<BlueRate> {
  const cacheKey = `${CACHE_PREFIX}${date}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      return data;
    }
  }

  const response = await fetch(`${API_BASE_URL}/historical?day=${date}`);
  const data = await response.json() as APIResponse;
  const historicalRate: BlueRate = {
    value_sell: data.blue.value_sell,
    date: date,
  };

  cache.set(cacheKey, JSON.stringify({ data: historicalRate, timestamp: Date.now() }));

  return historicalRate;
}