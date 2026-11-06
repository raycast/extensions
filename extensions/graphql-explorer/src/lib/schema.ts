import { environment } from "@raycast/api";
import { buildClientSchema, getIntrospectionQuery, GraphQLSchema, IntrospectionQuery } from "graphql";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { executeGraphQL } from "./request";
import { GraphQLEnvironment } from "./types";

/*
 * The schema is only used to improve the variables form (enum dropdowns, JSON templates for input objects).
 * It is fetched through introspection and cached on disk, so most runs don't pay for an extra request.
 * Many production servers disable introspection: failures are cached for a short time and the form falls back
 * to what can be inferred from the query alone.
 */

const SCHEMA_TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 10 * 60 * 1000;
const INTROSPECTION_TIMEOUT_MS = 15_000;

export interface SchemaResult {
  schema?: GraphQLSchema;
  error?: string;
}

interface CacheEntry {
  fetchedAt: number;
  introspection?: IntrospectionQuery;
  error?: string;
}

const memoryCache = new Map<string, { fetchedAt: number; result: SchemaResult }>();

type EnvKey = Pick<GraphQLEnvironment, "url" | "headers">;

/** The cache key changes whenever the URL or headers change, so stale schemas are never reused. */
function fingerprint(env: EnvKey): string {
  return createHash("sha1")
    .update(JSON.stringify([env.url, env.headers]))
    .digest("hex");
}

const cacheDir = () => join(environment.supportPath, "schemas");
const cacheFile = (env: EnvKey) => join(cacheDir(), `${fingerprint(env)}.json`);

async function readCache(env: EnvKey): Promise<CacheEntry | undefined> {
  try {
    return JSON.parse(await readFile(cacheFile(env), "utf8")) as CacheEntry;
  } catch {
    return undefined;
  }
}

async function writeCache(env: EnvKey, entry: CacheEntry) {
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(cacheFile(env), JSON.stringify(entry));
  } catch {
    // Caching is best effort.
  }
}

export async function clearSchemaCache(env: EnvKey): Promise<void> {
  memoryCache.delete(fingerprint(env));
  await rm(cacheFile(env), { force: true });
}

function toResult(entry: CacheEntry): SchemaResult {
  if (!entry.introspection) return { error: entry.error ?? "Introspection failed" };
  try {
    return { schema: buildClientSchema(entry.introspection, { assumeValid: true }) };
  } catch (error) {
    return { error: `Invalid introspection result: ${error instanceof Error ? error.message : String(error)}` };
  }
}

const isFresh = (entry: { fetchedAt: number; introspection?: unknown; result?: SchemaResult }) => {
  const ok = Boolean(entry.introspection ?? entry.result?.schema);
  return Date.now() - entry.fetchedAt < (ok ? SCHEMA_TTL_MS : FAILURE_TTL_MS);
};

async function introspect(env: EnvKey): Promise<CacheEntry> {
  const result = await executeGraphQL(
    env,
    { query: getIntrospectionQuery(), operationName: "IntrospectionQuery" },
    { timeoutMs: INTROSPECTION_TIMEOUT_MS },
  );
  const fetchedAt = Date.now();
  if (result.error) return { fetchedAt, error: result.error };
  const data = (result.json as { data?: IntrospectionQuery } | undefined)?.data;
  if (data?.__schema) return { fetchedAt, introspection: data };
  const firstError = (result.json as { errors?: { message?: string }[] } | undefined)?.errors?.[0]?.message;
  return { fetchedAt, error: firstError ?? `HTTP ${result.status ?? "?"}: introspection returned no schema` };
}

export async function loadSchema(env: EnvKey | undefined, options: { force?: boolean } = {}): Promise<SchemaResult> {
  if (!env) return { error: "No environment" };
  const key = fingerprint(env);

  if (!options.force) {
    const memo = memoryCache.get(key);
    if (memo && isFresh(memo)) return memo.result;
    const cached = await readCache(env);
    if (cached && isFresh(cached)) {
      const result = toResult(cached);
      memoryCache.set(key, { fetchedAt: cached.fetchedAt, result });
      return result;
    }
  }

  const entry = await introspect(env);
  await writeCache(env, entry);
  const result = toResult(entry);
  memoryCache.set(key, { fetchedAt: entry.fetchedAt, result });
  return result;
}
