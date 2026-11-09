import type { ModelProfile } from './profiles.js'

/** Values of `supported_endpoint_types` the gateway publishes today. */
export type EndpointType =
  | 'openai'
  | 'openai-response'
  | 'openai-response-compact'
  | 'anthropic'
  | 'gemini'
  | 'jina-rerank'
  | 'image-generation'
  | 'embeddings'
  | 'decisions'
  | 'openai-video'
  | (string & {})

/** One entry of `GET /v1/models`. */
export interface ModelListEntry {
  id: string
  owned_by?: string
  supported_endpoint_types?: EndpointType[] | null
  kind?: ModelKind | null
  image_route?: ImageRoute | null
}

/** The fields of a public `GET /api/pricing` entry that classification reads. */
export interface CatalogEntry {
  model_name: string
  supported_endpoint_types?: EndpointType[] | null
  media_options?: { image?: unknown; video?: unknown } | null
  image_generation_prices?: Array<{ size?: string; price?: number }> | null
  image_feature_prices?: Array<{ price?: number }> | null
  video_resolution_price?: Record<string, number> | null
  video_feature_prices?: Array<{ price?: number }> | null
}

export type ModelKind = 'text' | 'image' | 'video' | 'embedding' | 'rerank'

/** Which route an image model is called on. */
export type ImageRoute = 'gemini-generate-content' | 'images'

export interface ClassifiedModel {
  id: string
  kind: ModelKind
  ownedBy?: string
  /** Endpoint types from the key's model list and the public catalog. */
  endpoints: EndpointType[]
  /** Set for image models only. */
  imageRoute?: ImageRoute
  /** Present when the directory was created with `includeProfiles`. */
  profile?: ModelProfile
}

const TEXT_ENDPOINTS: ReadonlySet<string> = new Set(['openai', 'openai-response', 'anthropic'])

function hasPositivePrice(points: ReadonlyArray<{ price?: number }> | null | undefined): boolean {
  return (points ?? []).some((point) => typeof point.price === 'number' && point.price > 0)
}

function declaresImage(entry: CatalogEntry | undefined, endpoints: ReadonlySet<string>): boolean {
  if (endpoints.has('image-generation')) return true
  if (!entry) return false
  if (entry.media_options?.image != null) return true
  const sized = (entry.image_generation_prices ?? []).some(
    (point) => typeof point.size === 'string' && point.size.trim() !== '' && typeof point.price === 'number' && point.price > 0,
  )
  return sized || hasPositivePrice(entry.image_feature_prices)
}

function declaresVideo(entry: CatalogEntry | undefined, endpoints: ReadonlySet<string>): boolean {
  if (endpoints.has('openai-video')) return true
  if (!entry) return false
  if (entry.media_options?.video != null) return true
  const byResolution = Object.entries(entry.video_resolution_price ?? {}).some(
    ([resolution, price]) => resolution.trim() !== '' && price > 0,
  )
  return byResolution || hasPositivePrice(entry.video_feature_prices)
}

function imageRoute(endpoints: ReadonlySet<string>): ImageRoute | undefined {
  if (endpoints.has('gemini')) return 'gemini-generate-content'
  if (endpoints.has('image-generation')) return 'images'
  return undefined
}

/**
 * Sorts the key's models into text, image, video, embedding and rerank, and
 * drops everything else.
 *
 * The public catalog is required to recognise Gemini image models, whose only
 * endpoint type is `gemini` (shared with Gemini text models). It only lists
 * models of public groups, so models from groups unlocked on the account are
 * classified from their own endpoint types. Pass `null` when the catalog is
 * unavailable.
 */
export function classifyModels(
  models: readonly ModelListEntry[],
  catalog: readonly CatalogEntry[] | null,
): ClassifiedModel[] {
  const catalogByName = new Map((catalog ?? []).map((entry) => [entry.model_name, entry] as const))
  const classified: ClassifiedModel[] = []
  for (const model of models) {
    const entry = catalogByName.get(model.id)
    const ownEndpoints = model.supported_endpoint_types ?? []
    const endpoints = [...new Set([...ownEndpoints, ...(entry?.supported_endpoint_types ?? [])])]
    const endpointSet = new Set<string>(endpoints)
    const base = {
      id: model.id,
      endpoints,
      ...(model.owned_by ? { ownedBy: model.owned_by } : {}),
    }

    if (model.kind === 'image') {
      const route = model.image_route ?? imageRoute(endpointSet)
      if (route) classified.push({ ...base, kind: 'image', imageRoute: route })
      continue
    }
    if (model.kind === 'video' || model.kind === 'embedding' || model.kind === 'rerank' || model.kind === 'text') {
      classified.push({ ...base, kind: model.kind })
      continue
    }

    if (declaresImage(entry, endpointSet)) {
      const route = imageRoute(endpointSet)
      if (route) classified.push({ ...base, kind: 'image', imageRoute: route })
      continue
    }
    if (declaresVideo(entry, endpointSet)) {
      classified.push({ ...base, kind: 'video' })
      continue
    }
    if (endpointSet.has('embeddings')) {
      classified.push({ ...base, kind: 'embedding' })
      continue
    }
    if (endpointSet.has('jina-rerank')) {
      classified.push({ ...base, kind: 'rerank' })
      continue
    }
    if (ownEndpoints.some((endpoint) => TEXT_ENDPOINTS.has(endpoint))) {
      classified.push({ ...base, kind: 'text' })
    }
  }
  return classified
}

export function needsCatalog(models: readonly ModelListEntry[]): boolean {
  return models.some((model) => {
    if (model.kind != null) return false
    const endpoints = model.supported_endpoint_types ?? []
    if (endpoints.some((endpoint) => endpoint === 'image-generation' || endpoint === 'openai-video' || endpoint === 'embeddings' || endpoint === 'jina-rerank')) {
      return false
    }
    return endpoints.some((endpoint) => endpoint === 'openai' || endpoint === 'openai-response' || endpoint === 'anthropic' || endpoint === 'gemini')
  })
}

export function supportsEndpoint(model: ClassifiedModel, endpoint: EndpointType): boolean {
  return model.endpoints.includes(endpoint)
}
