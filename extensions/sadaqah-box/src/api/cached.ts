/**
 * Cached API functions
 * Wraps API calls with Raycast Cache using host-scoped, parameterized keys
 */

import { getApiHost } from "./client";
import {
  getHealth,
  getStats,
  listBoxes,
  createBox,
  getBox,
  updateBox,
  deleteBox,
  emptyBox,
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
import { withCache, CACHE_TTL, buildCacheKey, invalidateByPrefix } from "../utils/cache";
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

function hostKey(...parts: Array<string | number>): string {
  return buildCacheKey(getApiHost(), ...parts);
}

export function invalidateBoxesCache(): void {
  invalidateByPrefix(hostKey("boxes"));
}

export function invalidateStatsCache(): void {
  invalidateByPrefix(hostKey("stats"));
}

function invalidateBoxMutationCaches(
  boxId: string,
  options?: { includeStats?: boolean; includeCollections?: boolean },
) {
  invalidateByPrefix(hostKey("box", boxId));
  invalidateBoxesCache();
  if (options?.includeStats ?? true) {
    invalidateStatsCache();
  }
  if (options?.includeCollections) {
    invalidateByPrefix(hostKey("collections", boxId));
  }
}

export async function getHealthCached(): Promise<HealthResponse> {
  return getHealth();
}

export async function getStatsCached(): Promise<StatsResponse> {
  return withCache(hostKey("stats"), () => getStats(), CACHE_TTL.STATS);
}

export async function listBoxesCached(
  sortBy: "name" | "createdAt" | "count" | "totalValue" = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
): Promise<ListBoxesResponse> {
  return withCache(hostKey("boxes", sortBy, sortOrder), () => listBoxes(sortBy, sortOrder), CACHE_TTL.BOXES);
}

export async function createBoxCached(data: CreateBoxRequest): Promise<BoxResponse> {
  const result = await createBox(data);
  invalidateBoxesCache();
  invalidateStatsCache();
  return result;
}

export async function getBoxCached(boxId: string): Promise<BoxWithStatsResponse> {
  return withCache(hostKey("box", boxId), () => getBox(boxId), CACHE_TTL.BOXES);
}

export async function updateBoxCached(boxId: string, data: UpdateBoxRequest): Promise<BoxResponse> {
  const result = await updateBox(boxId, data);
  invalidateBoxMutationCaches(boxId, { includeStats: false });
  return result;
}

export async function deleteBoxCached(boxId: string): Promise<DeleteResponse> {
  const result = await deleteBox(boxId);
  invalidateBoxMutationCaches(boxId, { includeCollections: true });
  return result;
}

export async function emptyBoxCached(boxId: string): Promise<EmptyBoxResponse> {
  const result = await emptyBox(boxId);
  invalidateBoxMutationCaches(boxId, { includeCollections: true });
  return result;
}

export async function listSadaqahsCached(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListSadaqahsResponse> {
  return listSadaqahs(boxId, page, limit);
}

export async function addSadaqahCached(boxId: string, data: AddSadaqahRequest): Promise<AddSadaqahResponse> {
  const result = await addSadaqah(boxId, data);
  invalidateBoxMutationCaches(boxId);
  return result;
}

export async function deleteSadaqahCached(boxId: string, sadaqahId: string): Promise<DeleteSadaqahResponse> {
  const result = await deleteSadaqah(boxId, sadaqahId);
  invalidateBoxMutationCaches(boxId);
  return result;
}

export async function listCollectionsCached(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListCollectionsResponse> {
  return listCollections(boxId, page, limit);
}

export async function listCurrenciesCached(): Promise<ListCurrenciesResponse> {
  return withCache(hostKey("currencies"), () => listCurrencies(), CACHE_TTL.CURRENCIES);
}

export async function getCurrencyCached(currencyId: string): Promise<CurrencyResponse> {
  return getCurrency(currencyId);
}

export async function createCurrencyCached(data: CreateCurrencyRequest): Promise<CurrencyResponse> {
  const result = await createCurrency(data);
  invalidateByPrefix(hostKey("currencies"));
  return result;
}

export async function deleteCurrencyCached(currencyId: string): Promise<DeleteResponse> {
  const result = await deleteCurrency(currencyId);
  invalidateByPrefix(hostKey("currencies"));
  return result;
}

export async function updateGoldRatesCached(): Promise<UpdateGoldRatesResponse> {
  const result = await updateGoldRates();
  invalidateByPrefix(hostKey("currencies"));
  return result;
}

export async function listCurrencyTypesCached(): Promise<ListCurrencyTypesResponse> {
  return withCache(hostKey("currency-types"), () => listCurrencyTypes(), CACHE_TTL.CURRENCIES);
}

export async function getCurrencyTypeCached(currencyTypeId: string): Promise<CurrencyTypeResponse> {
  return getCurrencyType(currencyTypeId);
}

export async function createCurrencyTypeCached(data: CreateCurrencyTypeRequest): Promise<CurrencyTypeResponse> {
  const result = await createCurrencyType(data);
  invalidateByPrefix(hostKey("currency-types"));
  return result;
}

export async function deleteCurrencyTypeCached(currencyTypeId: string): Promise<DeleteResponse> {
  const result = await deleteCurrencyType(currencyTypeId);
  invalidateByPrefix(hostKey("currency-types"));
  return result;
}
