/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { createHash } from "node:crypto";

import { Cache } from "@raycast/api";

import { myPreferences } from "@/consts";
import type { DetectedLangModel } from "@/core/detect/types";
import type { DictionaryResult, QueryInput, RuntimeServiceConfig, TranslationResult } from "@/types/query";
import { logWarn } from "@/utils/logger";

const CACHE_FORMAT_VERSION = 1;
const DAY = 24 * 60 * 60 * 1_000;
const MAX_ENTRY_BYTES = 1024 * 1024;

const resultCache = new Cache({ namespace: "query-results", capacity: 6 * 1024 * 1024 });
const aiResultCache = new Cache({ namespace: "query-results-ai", capacity: 3 * 1024 * 1024 });
const detectionCache = new Cache({ namespace: "query-language-detection", capacity: 1024 * 1024 });

type QueryCacheMode = "off" | "words" | "all";
type CacheableResult = TranslationResult | DictionaryResult;

interface CacheEntry<T> {
  version: number;
  expiresAt: number;
  value: T;
}

let disabledCachesSynchronized = false;
let cacheGeneration = 0;

function synchronizeDisabledCaches() {
  if (disabledCachesSynchronized) return;
  disabledCachesSynchronized = true;

  try {
    if (myPreferences.queryCacheMode === "off") resultCache.clear({ notifySubscribers: false });
    if (myPreferences.aiQueryCacheMode === "off") aiResultCache.clear({ notifySubscribers: false });
    if (myPreferences.queryCacheMode === "off" && myPreferences.aiQueryCacheMode === "off") {
      detectionCache.clear({ notifySubscribers: false });
    }
  } catch (error) {
    logWarn("QueryCache", `failed to clear disabled cache: ${String(error)}`);
  }
}

function permitsInput(mode: QueryCacheMode, query: QueryInput, confirmedIsWord?: boolean): boolean {
  if (mode === "all") return true;
  if (mode !== "words" || query.isWord === false || confirmedIsWord === false) return false;
  if (query.isWord === true || confirmedIsWord === true || isConservativeStandaloneWord(query.word)) return true;
  return hasWordEvidence(query.word);
}

function isAIService(service: RuntimeServiceConfig): boolean {
  return service.providerKey.startsWith("ai:");
}

function getResultCache(service: RuntimeServiceConfig): Cache {
  return isAIService(service) ? aiResultCache : resultCache;
}

function getResultCacheMode(service: RuntimeServiceConfig): QueryCacheMode {
  return isAIService(service) ? myPreferences.aiQueryCacheMode : myPreferences.queryCacheMode;
}

function hashKey(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resultCacheKey(service: RuntimeServiceConfig, query: QueryInput): string {
  return hashKey({
    version: CACHE_FORMAT_VERSION,
    kind: "result",
    service: service.providerKey,
    configuration: service.cacheIdentity ?? service.providerKey,
    word: query.word,
    fromLanguage: query.fromLanguage,
    toLanguage: query.toLanguage,
    isWord: query.isWord,
  });
}

function detectionCacheKey(text: string): string {
  return hashKey({
    version: CACHE_FORMAT_VERSION,
    kind: "detection",
    text,
    preferredLanguages: [myPreferences.language1, myPreferences.language2],
    speedFirst: myPreferences.enableDetectLanguageSpeedFirst,
    detectors: [
      myPreferences.enableBaiduLanguageDetect,
      myPreferences.enableTencentLanguageDetect,
      myPreferences.enableVolcanoLanguageDetect,
    ],
    credentials: [
      myPreferences.baiduAppId,
      myPreferences.baiduAppSecret,
      myPreferences.tencentSecretId,
      myPreferences.tencentSecretKey,
      myPreferences.volcanoAccessKeyId,
      myPreferences.volcanoAccessKeySecret,
    ],
  });
}

function wordEvidenceKey(text: string): string {
  return hashKey({ version: CACHE_FORMAT_VERSION, kind: "confirmed-word", text });
}

function readEntry<T>(cache: Cache, key: string, validate: (value: unknown) => value is T): T | undefined {
  try {
    const serialized = cache.get(key);
    if (!serialized) return undefined;
    const entry: unknown = JSON.parse(serialized);
    if (!isRecord(entry) || entry.version !== CACHE_FORMAT_VERSION || typeof entry.expiresAt !== "number") {
      safelyRemove(cache, key);
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      safelyRemove(cache, key);
      return undefined;
    }
    if (!validate(entry.value)) {
      safelyRemove(cache, key);
      return undefined;
    }
    return entry.value;
  } catch (error) {
    safelyRemove(cache, key);
    logWarn("QueryCache", `discarding invalid cache entry: ${String(error)}`);
    return undefined;
  }
}

function safelyRemove(cache: Cache, key: string) {
  try {
    cache.remove(key);
  } catch {
    // Cache failures must not prevent a provider request.
  }
}

function writeEntry<T>(cache: Cache, key: string, value: T, ttl: number) {
  try {
    const entry: CacheEntry<T> = { version: CACHE_FORMAT_VERSION, expiresAt: Date.now() + ttl, value };
    const serialized = JSON.stringify(entry);
    if (Buffer.byteLength(serialized, "utf8") <= MAX_ENTRY_BYTES) cache.set(key, serialized);
  } catch (error) {
    logWarn("QueryCache", `failed to write cache entry: ${String(error)}`);
  }
}

export function getCachedQueryResult(service: RuntimeServiceConfig, query: QueryInput): CacheableResult | undefined {
  synchronizeDisabledCaches();
  if (!permitsInput(getResultCacheMode(service), query)) return undefined;
  return readEntry(getResultCache(service), resultCacheKey(service, query), isCacheableResult);
}

export function cacheQueryResult(
  service: RuntimeServiceConfig,
  query: QueryInput,
  result: CacheableResult,
  expectedGeneration = cacheGeneration,
): void {
  synchronizeDisabledCaches();
  if (expectedGeneration !== cacheGeneration) return;
  const mode = getResultCacheMode(service);
  if (!permitsInput(mode, query, result.queryWordInfo.isWord)) return;
  const ttl = !isAIService(service) && !("translations" in result) ? 7 * DAY : DAY;
  const cache = getResultCache(service);
  if (result.queryWordInfo.isWord === true) writeEntry(cache, wordEvidenceKey(query.word), true, ttl);
  writeEntry(cache, resultCacheKey(service, query), result, ttl);
}

export function getCachedLanguageDetection(text: string): DetectedLangModel | undefined {
  synchronizeDisabledCaches();
  if (!permitsDetection(text)) return undefined;
  return readEntry(detectionCache, detectionCacheKey(text), isDetectedLanguage);
}

export function cacheLanguageDetection(
  text: string,
  result: DetectedLangModel,
  expectedGeneration = cacheGeneration,
): void {
  synchronizeDisabledCaches();
  if (expectedGeneration !== cacheGeneration || !permitsDetection(text) || !result.confirmed) return;
  writeEntry(detectionCache, detectionCacheKey(text), result, DAY);
}

export function getQueryCacheGeneration(): number {
  return cacheGeneration;
}

export function clearQueryCache(): void {
  cacheGeneration += 1;
  for (const cache of [resultCache, aiResultCache, detectionCache]) {
    try {
      cache.clear();
    } catch (error) {
      logWarn("QueryCache", `failed to clear cache: ${String(error)}`);
    }
  }
}

function permitsDetection(text: string): boolean {
  const query = { word: text, fromLanguage: "", toLanguage: "" };
  return permitsInput(myPreferences.queryCacheMode, query) || permitsInput(myPreferences.aiQueryCacheMode, query);
}

function hasWordEvidence(text: string): boolean {
  const key = wordEvidenceKey(text);
  return (
    (myPreferences.queryCacheMode === "words" && readEntry(resultCache, key, isTrue)) ||
    (myPreferences.aiQueryCacheMode === "words" && readEntry(aiResultCache, key, isTrue)) ||
    false
  );
}

function isTrue(value: unknown): value is true {
  return value === true;
}

function isConservativeStandaloneWord(text: string): boolean {
  const word = text.trim();
  if (!word || word !== text || /\s/u.test(word)) return false;
  if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(word)) return false;
  return /^[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*$/u.test(word);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQueryInput(value: unknown): value is QueryInput {
  return (
    isRecord(value) &&
    typeof value.word === "string" &&
    typeof value.fromLanguage === "string" &&
    typeof value.toLanguage === "string"
  );
}

function isCacheableResult(value: unknown): value is CacheableResult {
  if (!isRecord(value) || typeof value.type !== "string" || !isQueryInput(value.queryWordInfo)) return false;
  if ("translations" in value) {
    return (
      Array.isArray(value.translations) &&
      value.translations.length > 0 &&
      value.translations.every((v) => typeof v === "string") &&
      value.translations.some((v) => v.trim().length > 0)
    );
  }
  return (
    Array.isArray(value.displaySections) &&
    value.displaySections.length > 0 &&
    value.displaySections.every(isDisplaySection)
  );
}

function isDisplaySection(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.queryType === "string" &&
        isQueryInput(item.queryWordInfo) &&
        typeof item.key === "string" &&
        typeof item.title === "string" &&
        typeof item.copyText === "string",
    )
  );
}

function isDetectedLanguage(value: unknown): value is DetectedLangModel {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    typeof value.youdaoLangCode === "string" &&
    typeof value.sourceLangCode === "string" &&
    value.confirmed === true
  );
}
