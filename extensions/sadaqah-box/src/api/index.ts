/**
 * Refactored API Layer
 * Uses the new client with timeout, retry, and proper error handling
 */

import { get, post, patch, del } from "./client";
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

// Health Check (no auth required)
export async function getHealth(): Promise<HealthResponse> {
  return get<HealthResponse>("/api/health");
}

// Stats
export async function getStats(): Promise<StatsResponse> {
  return get<StatsResponse>("/api/stats");
}

// Boxes
export async function listBoxes(
  sortBy: "name" | "createdAt" | "count" | "totalValue" = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
): Promise<ListBoxesResponse> {
  return get<ListBoxesResponse>("/api/boxes", { sortBy, sortOrder });
}

export async function createBox(data: CreateBoxRequest): Promise<BoxResponse> {
  return post<BoxResponse>("/api/boxes", data);
}

export async function getBox(boxId: string): Promise<BoxWithStatsResponse> {
  return get<BoxWithStatsResponse>(`/api/boxes/${encodeURIComponent(boxId)}`);
}

export async function updateBox(boxId: string, data: UpdateBoxRequest): Promise<BoxResponse> {
  return patch<BoxResponse>(`/api/boxes/${encodeURIComponent(boxId)}`, data);
}

export async function deleteBox(boxId: string): Promise<DeleteResponse> {
  return del<DeleteResponse>(`/api/boxes/${encodeURIComponent(boxId)}`);
}

export async function emptyBox(boxId: string): Promise<EmptyBoxResponse> {
  return post<EmptyBoxResponse>(`/api/boxes/${encodeURIComponent(boxId)}/empty`, {});
}

export async function getBoxCollections(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListCollectionsResponse> {
  return get<ListCollectionsResponse>(`/api/boxes/${encodeURIComponent(boxId)}/collections`, { page, limit });
}

// Sadaqahs
export async function listSadaqahs(boxId: string, page: number = 1, limit: number = 20): Promise<ListSadaqahsResponse> {
  return get<ListSadaqahsResponse>(`/api/boxes/${encodeURIComponent(boxId)}/sadaqahs`, { page, limit });
}

export async function addSadaqah(boxId: string, data: AddSadaqahRequest): Promise<AddSadaqahResponse> {
  return post<AddSadaqahResponse>(`/api/boxes/${encodeURIComponent(boxId)}/sadaqahs`, data);
}

export async function deleteSadaqah(boxId: string, sadaqahId: string): Promise<DeleteSadaqahResponse> {
  return del<DeleteSadaqahResponse>(
    `/api/boxes/${encodeURIComponent(boxId)}/sadaqahs/${encodeURIComponent(sadaqahId)}`,
  );
}

// Collections
export async function listCollections(
  boxId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListCollectionsResponse> {
  return get<ListCollectionsResponse>(`/api/boxes/${encodeURIComponent(boxId)}/collections`, { page, limit });
}

// Currencies
export async function listCurrencies(): Promise<ListCurrenciesResponse> {
  return get<ListCurrenciesResponse>("/api/currencies");
}

export async function getCurrency(currencyId: string): Promise<CurrencyResponse> {
  return get<CurrencyResponse>(`/api/currencies/${encodeURIComponent(currencyId)}`);
}

export async function createCurrency(data: CreateCurrencyRequest): Promise<CurrencyResponse> {
  return post<CurrencyResponse>("/api/currencies", data);
}

export async function deleteCurrency(currencyId: string): Promise<DeleteResponse> {
  return del<DeleteResponse>(`/api/currencies/${encodeURIComponent(currencyId)}`);
}

export async function updateGoldRates(): Promise<UpdateGoldRatesResponse> {
  return post<UpdateGoldRatesResponse>("/api/currencies/update-gold-rates", {});
}

// Currency Types
export async function listCurrencyTypes(): Promise<ListCurrencyTypesResponse> {
  return get<ListCurrencyTypesResponse>("/api/currency-types");
}

export async function getCurrencyType(currencyTypeId: string): Promise<CurrencyTypeResponse> {
  return get<CurrencyTypeResponse>(`/api/currency-types/${encodeURIComponent(currencyTypeId)}`);
}

export async function createCurrencyType(data: CreateCurrencyTypeRequest): Promise<CurrencyTypeResponse> {
  return post<CurrencyTypeResponse>("/api/currency-types", data);
}

export async function deleteCurrencyType(currencyTypeId: string): Promise<DeleteResponse> {
  return del<DeleteResponse>(`/api/currency-types/${encodeURIComponent(currencyTypeId)}`);
}
