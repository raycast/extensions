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

// The catalog only refines classification and is always read from the global
// host, which China-entry users may reach slowly. It must not hold up the
// key's own model list, so its request has its own deadline.
const CATALOG_TIMEOUT_MS = 8_000

/**
 * Public catalog from `GET https://modelflare.dev/api/pricing`. It needs no key
 * and is only served on the global host.
 */
export async function fetchCatalog(fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<CatalogEntry[]> {
  const deadline = AbortSignal.timeout(CATALOG_TIMEOUT_MS)
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline
  let response: Response
  let body: { success?: boolean; data?: CatalogEntry[] }
  try {
    response = await fetchImpl(CATALOG_URL, { method: 'GET', signal: requestSignal })
    if (!response.ok) throw await errorFromResponse(response)
    body = (await response.json()) as { success?: boolean; data?: CatalogEntry[] }
  } catch (error) {
    if (error instanceof ModelflareError) throw error
    throw new ModelflareError(
      { kind: deadline.aborted ? 'timeout' : 'network', message: 'Could not reach the Modelflare catalog' },
      { cause: error },
    )
  }
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
