/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { createHash } from "node:crypto";

import { Cache } from "@raycast/api";

import { myPreferences } from "@/consts";
import { decodeProviderContent } from "@/core/content/decode";
import type { DetectionDecision } from "@/core/detect/types";
import { parseSourceLanguage } from "@/core/language/utils";
import { DictionaryType, LanguageDetectType, TranslationType } from "@/core/results/kinds";
import type { ProviderResult, QueryInput, RuntimeServiceConfig } from "@/core/results/types";
import { logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

const CACHE_FORMAT_VERSION = 1;
const RESULT_FORMAT_VERSION = 2;
const DAY = 24 * 60 * 60 * 1_000;
const MAX_ENTRY_BYTES = 1024 * 1024;

const resultCache = new Cache({ namespace: "query-results", capacity: 6 * 1024 * 1024 });
const aiResultCache = new Cache({ namespace: "query-results-ai", capacity: 3 * 1024 * 1024 });
const detectionCache = new Cache({ namespace: "query-language-detection", capacity: 1024 * 1024 });

type QueryCacheMode = "off" | "words" | "all";

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

/** Whether either cache mode can still serve or store results. */
export function hasEnabledQueryCache(): boolean {
  return myPreferences.queryCacheMode !== "off" || myPreferences.aiQueryCacheMode !== "off";
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
    version: RESULT_FORMAT_VERSION,
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

function readEntry<T>(
  cache: Cache,
  key: string,
  decode: (value: unknown) => T,
  version = CACHE_FORMAT_VERSION,
): T | undefined {
  try {
    const serialized = cache.get(key);
    if (!serialized) return undefined;
    const entry: unknown = JSON.parse(serialized);
    if (
      !isRecord(entry) ||
      entry.version !== version ||
      typeof entry.expiresAt !== "number" ||
      !Number.isFinite(entry.expiresAt)
    ) {
      safelyRemove(cache, key);
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      safelyRemove(cache, key);
      return undefined;
    }
    return decode(entry.value);
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

function writeEntry<T>(cache: Cache, key: string, value: T, ttl: number, version = CACHE_FORMAT_VERSION) {
  try {
    const entry: CacheEntry<T> = { version, expiresAt: Date.now() + ttl, value };
    const serialized = JSON.stringify(entry);
    if (Buffer.byteLength(serialized, "utf8") <= MAX_ENTRY_BYTES) cache.set(key, serialized);
  } catch (error) {
    logWarn("QueryCache", `failed to write cache entry: ${String(error)}`);
  }
}

export function getCachedQueryResult(service: RuntimeServiceConfig, query: QueryInput): ProviderResult | undefined {
  synchronizeDisabledCaches();
  if (!permitsInput(getResultCacheMode(service), query)) return undefined;
  return readEntry(getResultCache(service), resultCacheKey(service, query), decodeResult, RESULT_FORMAT_VERSION);
}

export function cacheQueryResult(
  service: RuntimeServiceConfig,
  query: QueryInput,
  result: ProviderResult,
  expectedGeneration = cacheGeneration,
): void {
  synchronizeDisabledCaches();
  if (expectedGeneration !== cacheGeneration) return;
  const mode = getResultCacheMode(service);
  if (!permitsInput(mode, query, result.content.query.isWord)) return;
  const ttl = !isAIService(service) && result.content.kind === "dictionary" ? 7 * DAY : DAY;
  const cache = getResultCache(service);
  if (result.content.query.isWord === true) writeEntry(cache, wordEvidenceKey(query.word), true, ttl);
  writeEntry(
    cache,
    resultCacheKey(service, query),
    { type: result.type, content: result.content },
    ttl,
    RESULT_FORMAT_VERSION,
  );
}

export function getCachedLanguageDetection(text: string): DetectionDecision | undefined {
  synchronizeDisabledCaches();
  if (!permitsDetection(text)) return undefined;
  return readEntry(detectionCache, detectionCacheKey(text), decodeDetectedLanguage);
}

export function cacheLanguageDetection(
  text: string,
  result: DetectionDecision,
  expectedGeneration = cacheGeneration,
): void {
  synchronizeDisabledCaches();
  if (expectedGeneration !== cacheGeneration || !permitsDetection(text) || !result.confirmed) return;
  writeEntry(
    detectionCache,
    detectionCacheKey(text),
    {
      type: result.type,
      youdaoLangCode: result.language,
      sourceLangCode: "",
      confirmed: true,
    },
    DAY,
  );
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
    (myPreferences.queryCacheMode === "words" && readEntry(resultCache, key, decodeWordEvidence)) ||
    (myPreferences.aiQueryCacheMode === "words" && readEntry(aiResultCache, key, decodeWordEvidence)) ||
    false
  );
}

function decodeWordEvidence(value: unknown): true {
  if (value !== true) throw new Error("Invalid word evidence");
  return true;
}

function isConservativeStandaloneWord(text: string): boolean {
  const word = text.trim();
  if (!word || word !== text || /\s/u.test(word)) return false;
  if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(word)) return false;
  return /^[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*$/u.test(word);
}

function decodeDetectedLanguage(value: unknown): DetectionDecision {
  if (!isRecord(value)) throw new Error("Invalid cached detection");
  const type = Object.values(LanguageDetectType).find((type) => type === value.type);
  const language = parseSourceLanguage(value.youdaoLangCode);
  if (!type || language === undefined || language === "auto" || value.confirmed !== true) {
    throw new Error("Invalid cached detection");
  }
  return { type, language, confirmed: true };
}

function decodeResult(value: unknown): ProviderResult {
  if (!isRecord(value)) throw new Error("Invalid cached result");
  const content = decodeProviderContent(value.content);
  if (content.kind === "translation") {
    const type = Object.values(TranslationType).find((type) => type === value.type);
    if (!type || !content.paragraphs.some((text) => text.trim())) throw new Error("Invalid cached translation");
    return { type, content };
  }
  const type = Object.values(DictionaryType).find((type) => type === value.type);
  if (!type || !content.sections.length) throw new Error("Invalid cached dictionary");
  return { type, content };
}
