import { Cache } from "@raycast/api";

interface MindicadorResponse {
  version: string;
  autor: string;
  codigo: string;
  nombre: string;
  unidad_medida: string;
  serie: Array<{
    fecha: string;
    valor: number;
  }>;
}

const cache = new Cache();
const CACHE_KEY_PREFIX = "uf-value-";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches the current UF value from mindicador.cl API
 * Uses caching to avoid excessive API calls (cached for 24 hours)
 */
export async function getUFValue(): Promise<number> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const cacheKey = `${CACHE_KEY_PREFIX}${today}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    const cachedData = JSON.parse(cached);
    const cacheTime = new Date(cachedData.timestamp).getTime();
    const now = Date.now();

    // If cache is still valid (within 24 hours), return cached value
    if (now - cacheTime < CACHE_DURATION) {
      return cachedData.value;
    }
  }

  try {
    // Fetch from API
    const response = await fetch("https://mindicador.cl/api/uf");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as MindicadorResponse;

    // Get the most recent UF value (first item in serie array)
    if (!data.serie || data.serie.length === 0) {
      throw new Error("No UF data available in API response");
    }

    const ufValue = data.serie[0].valor;

    // Cache the value with timestamp
    cache.set(
      cacheKey,
      JSON.stringify({
        value: ufValue,
        timestamp: new Date().toISOString(),
        date: today,
      }),
    );

    return ufValue;
  } catch (error) {
    // If API fails, try to use cached value even if expired
    if (cached) {
      const cachedData = JSON.parse(cached);
      console.warn("API failed, using cached value:", error);
      return cachedData.value;
    }

    throw new Error(
      `Failed to fetch UF value: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Gets the date of the cached UF value
 */
export function getCachedUFDate(): string | null {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${CACHE_KEY_PREFIX}${today}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    const cachedData = JSON.parse(cached);
    return cachedData.date || today;
  }

  return null;
}
