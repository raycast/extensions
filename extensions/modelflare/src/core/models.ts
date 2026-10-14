import { classifyModels, type CatalogEntry, type ClassifiedModel, type ModelListEntry } from './classify.js'
import type { ModelflareClient } from './client.js'
import { CATALOG_URL } from './config.js'
import { ModelflareError, errorFromResponse } from './errors.js'

export {
  classifyModels,
  supportsEndpoint,
  type CatalogEntry,
  type ClassifiedModel,
  type EndpointType,
  type ImageRoute,
  type ModelKind,
  type ModelListEntry,
} from './classify.js'

/** `GET /v1/models` for the client's key. */
export async function listModels(client: ModelflareClient, signal?: AbortSignal): Promise<ModelListEntry[]> {
  const body = await client.json<{ data?: ModelListEntry[] }>('models', {
    method: 'GET',
    ...(signal ? { signal } : {}),
  })
  return Array.isArray(body.data) ? body.data : []
}

/**
 * Public catalog from `GET https://modelflare.dev/api/pricing`. It needs no key
 * and is only served on the global host.
 */
export async function fetchCatalog(fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<CatalogEntry[]> {
  let response: Response
  try {
    response = await fetchImpl(CATALOG_URL, { method: 'GET', ...(signal ? { signal } : {}) })
  } catch (error) {
    throw new ModelflareError({ kind: 'network', message: 'Could not reach the Modelflare catalog' }, { cause: error })
  }
  if (!response.ok) throw await errorFromResponse(response)
  const body = (await response.json()) as { success?: boolean; data?: CatalogEntry[] }
  if (body.success === false || !Array.isArray(body.data)) {
    throw new ModelflareError({ kind: 'upstream', message: 'The Modelflare catalog is unavailable', status: response.status })
  }
  return body.data
}

export interface DirectorySnapshot {
  models: ClassifiedModel[]
  /** Every model ID the key's model list returned, classified or not. */
  listedIds: ReadonlySet<string>
  /** False when the catalog could not be read and no earlier copy exists. */
  catalogAvailable: boolean
  loadedAt: number
}

export interface ModelDirectoryOptions {
  client: ModelflareClient
  fetch?: typeof fetch
  /** Cache lifetime. Defaults to one hour. */
  ttlMs?: number
  now?: () => number
}

const DEFAULT_TTL_MS = 60 * 60 * 1000

/**
 * Cached, classified model list for one key. A failed catalog read keeps the
 * last good catalog; without one, only models whose own endpoint types are
 * conclusive are shown.
 */
export class ModelDirectory {
  readonly #client: ModelflareClient
  readonly #fetch: typeof fetch
  readonly #ttlMs: number
  readonly #now: () => number
  #snapshot: DirectorySnapshot | undefined
  #catalog: CatalogEntry[] | undefined

  constructor(options: ModelDirectoryOptions) {
    this.#client = options.client
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.#now = options.now ?? Date.now
  }

  async load(options: { force?: boolean; signal?: AbortSignal } = {}): Promise<DirectorySnapshot> {
    const cached = this.#snapshot
    if (!options.force && cached && this.#now() - cached.loadedAt < this.#ttlMs) return cached

    const [models, catalog] = await Promise.all([
      listModels(this.#client, options.signal),
      fetchCatalog(this.#fetch, options.signal).catch(() => undefined),
    ])
    if (catalog) this.#catalog = catalog
    const effectiveCatalog = catalog ?? this.#catalog ?? null
    this.#snapshot = {
      models: classifyModels(models, effectiveCatalog),
      listedIds: new Set(models.map((model) => model.id)),
      catalogAvailable: effectiveCatalog !== null,
      loadedAt: this.#now(),
    }
    return this.#snapshot
  }

  /**
   * Whether the key's model list contains this model. Used after a
   * `model_not_found` error to tell "not available to this key" from
   * "temporarily unavailable".
   */
  async isListed(modelId: string, signal?: AbortSignal): Promise<boolean> {
    const snapshot = await this.load({ force: true, ...(signal ? { signal } : {}) })
    return snapshot.listedIds.has(modelId)
  }
}
