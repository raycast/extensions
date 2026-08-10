/**
 * Cached API functions
 * Wraps API calls with Raycast Cache for improved performance
 */

import {
  getHealth,
  getStats,
  listBoxes,
  createBox,
  getBox,
  updateBox,
  deleteBox,
  emptyBox,
  getBoxCollections,
  listSadaqahs,
  addSadaqah,
  deleteSadaqah,
  listCollections,
  listCurrencies,
  getCurrency,
  createCurrency,
  deleteCurrency,
  updateGoldRates,
  listCurrencyTypes,
  getCurrencyType,
  createCurrencyType,
  deleteCurrencyType,
} from "./index";
import { withCache, CACHE_TTL, removeCachedData, invalidateBoxesCache, invalidateStatsCache } from "../utils/cache";
import type {
  HealthResponse,
  StatsResponse,
  ListBoxesResponse,
  BoxResponse,
  BoxWithStatsResponse,
  CreateBoxRequest,
  UpdateBoxRequest,
  EmptyBoxResponse,
  ListCollectionsResponse,
  ListSadaqahsResponse,
  AddSadaqahRequest,
  AddSadaqahResponse,
  DeleteSadaqahResponse,
  ListCurrenciesResponse,
  CurrencyResponse,
  CreateCurrencyRequest,
  UpdateGoldRatesResponse,
  ListCurrencyTypesResponse,
  CurrencyTypeResponse,
  CreateCurrencyTypeRequest,
  DeleteResponse,
} from "../types";

// Cached Health Check
export async function getHealthCached(): Promise<HealthResponse> {
  return getHealth(); // No caching for health check
}

// Cached Stats
export async function getStatsCached(): Promise<StatsResponse> {
  return withCache("stats", () => getStats(), CACHE_TTL.STATS);
}

// Cached Boxes
export async function listBoxesCached(
  sortBy: "name" | "createdAt" | "count" | "totalValue" = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
): Promise<ListBoxesResponse> {
  return withCache("boxes", () => listBoxes(sortBy, sortOrder), CACHE_TTL.BOXES);
}

// Create box - invalidates cache
export async function createBoxCached(data: CreateBoxRequest): Promise<BoxResponse> {
  const result = await createBox(data);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

// Get single box - cached per box ID
export async function getBoxCached(boxId: string): Promise<BoxWithStatsResponse> {
  return withCache(`box-${boxId}`, () => getBox(boxId), CACHE_TTL.BOXES);
}

// Update box - invalidates cache
export async function updateBoxCached(boxId: string, data: UpdateBoxRequest): Promise<BoxResponse> {
  const result = await updateBox(boxId, data);
  removeCachedData(`box-${boxId}`);
  invalidateBoxesCache();
  return result;
}

// Delete box - invalidates cache
export async function deleteBoxCached(boxId: string): Promise<DeleteResponse> {
  const result = await deleteBox(boxId);
  removeCachedData(`box-${boxId}`);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

// Empty box - invalidates cache
export async function emptyBoxCached(boxId: string): Promise<EmptyBoxResponse> {
  const result = await emptyBox(boxId);
  removeCachedData(`box-${boxId}`);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

// Get box collections - cached per box
export async function getBoxCollectionsCached(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListCollectionsResponse> {
  return withCache(`collections-${boxId}`, () => getBoxCollections(boxId, page, limit), CACHE_TTL.BOXES);
}

// Sadaqahs - no caching as they change frequently
export async function listSadaqahsCached(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListSadaqahsResponse> {
  return listSadaqahs(boxId, page, limit);
}

// Add sadaqah - invalidates cache
export async function addSadaqahCached(boxId: string, data: AddSadaqahRequest): Promise<AddSadaqahResponse> {
  const result = await addSadaqah(boxId, data);
  removeCachedData(`box-${boxId}`);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

// Delete sadaqah - invalidates cache
export async function deleteSadaqahCached(boxId: string, sadaqahId: string): Promise<DeleteSadaqahResponse> {
  const result = await deleteSadaqah(boxId, sadaqahId);
  removeCachedData(`box-${boxId}`);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

// Collections - no caching as they change
export async function listCollectionsCached(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListCollectionsResponse> {
  return listCollections(boxId, page, limit);
}

// Currencies - long cache
export async function listCurrenciesCached(): Promise<ListCurrenciesResponse> {
  return withCache("currencies", () => listCurrencies(), CACHE_TTL.CURRENCIES);
}

// Get currency - no individual caching
export async function getCurrencyCached(currencyId: string): Promise<CurrencyResponse> {
  return getCurrency(currencyId);
}

// Create currency - invalidates cache
export async function createCurrencyCached(data: CreateCurrencyRequest): Promise<CurrencyResponse> {
  const result = await createCurrency(data);
  removeCachedData("currencies");
  return result;
}

// Delete currency - invalidates cache
export async function deleteCurrencyCached(currencyId: string): Promise<DeleteResponse> {
  const result = await deleteCurrency(currencyId);
  removeCachedData("currencies");
  return result;
}

// Update gold rates - no caching
export async function updateGoldRatesCached(): Promise<UpdateGoldRatesResponse> {
  return updateGoldRates();
}

// Currency types - long cache
export async function listCurrencyTypesCached(): Promise<ListCurrencyTypesResponse> {
  return withCache("currency-types", () => listCurrencyTypes(), CACHE_TTL.CURRENCIES);
}

// Get currency type - no caching
export async function getCurrencyTypeCached(currencyTypeId: string): Promise<CurrencyTypeResponse> {
  return getCurrencyType(currencyTypeId);
}

// Create currency type - invalidates cache
export async function createCurrencyTypeCached(data: CreateCurrencyTypeRequest): Promise<CurrencyTypeResponse> {
  const result = await createCurrencyType(data);
  removeCachedData("currency-types");
  return result;
}

// Delete currency type - invalidates cache
export async function deleteCurrencyTypeCached(currencyTypeId: string): Promise<DeleteResponse> {
  const result = await deleteCurrencyType(currencyTypeId);
  removeCachedData("currency-types");
  return result;
}

// Cache invalidation helpers
export { invalidateBoxesCache, invalidateStatsCache };
