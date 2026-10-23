import type { ModelflareClient } from './client.js'

export type ModelInputModality = 'text' | 'image' | 'audio' | 'video' | 'pdf' | (string & {})

export interface ModelProfile {
  contextWindow: number
  maxInputTokens: number
  maxOutputTokens: number
  inputModalities: ModelInputModality[]
  toolCalling: boolean
  reasoning: boolean
}

export type ModelProfileIndex = ReadonlyMap<string, Partial<ModelProfile>>

export const MODEL_PROFILES_PATH = 'model-profiles'

const DEFAULT_PROFILE: ModelProfile = {
  contextWindow: 144_384,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  inputModalities: ['text'],
  toolCalling: false,
  reasoning: false,
}

const FAMILY_PROFILES: ReadonlyArray<readonly [RegExp, ModelProfile]> = [
  [
    /^claude-haiku-4-5$/u,
    {
      contextWindow: 200_000,
      maxInputTokens: 136_000,
      maxOutputTokens: 64_000,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^claude-/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 872_000,
      maxOutputTokens: 128_000,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^gemini-/u,
    {
      contextWindow: 1_048_576,
      maxInputTokens: 983_040,
      maxOutputTokens: 65_536,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^grok-/u,
    {
      contextWindow: 500_000,
      maxInputTokens: 372_000,
      maxOutputTokens: 128_000,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^deepseek-v4\.1-flash$/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 616_000,
      maxOutputTokens: 384_000,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^deepseek-/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 616_000,
      maxOutputTokens: 384_000,
      inputModalities: ['text'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^glm-5\.3-flash$/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 868_928,
      maxOutputTokens: 131_072,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^glm-/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 868_928,
      maxOutputTokens: 131_072,
      inputModalities: ['text'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^kimi-/u,
    {
      contextWindow: 1_048_576,
      maxInputTokens: 917_504,
      maxOutputTokens: 131_072,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^qwen/u,
    {
      contextWindow: 1_000_000,
      maxInputTokens: 868_928,
      maxOutputTokens: 131_072,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^muse-/u,
    {
      contextWindow: 1_048_576,
      maxInputTokens: 917_504,
      maxOutputTokens: 131_072,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
  [
    /^(?:gpt-[56]|codex-auto-review)/u,
    {
      contextWindow: 1_050_000,
      maxInputTokens: 922_000,
      maxOutputTokens: 128_000,
      inputModalities: ['text', 'image'],
      toolCalling: true,
      reasoning: true,
    },
  ],
]

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 10_000_000 ? value : undefined
}

export function buildModelProfileIndex(value: unknown): ModelProfileIndex {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Invalid model metadata')

  const index = new Map<string, Partial<ModelProfile>>()
  const ambiguous = new Set<string>()
  for (const [canonicalId, candidate] of Object.entries(value)) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) continue
    const raw = candidate as Record<string, unknown>
    const projectedContextWindow = positiveInteger(raw.context_window)
    const projectedMaxInputTokens = positiveInteger(raw.max_input_tokens)
    const projectedMaxOutputTokens = positiveInteger(raw.max_output_tokens)
    const projectedModalities = Array.isArray(raw.input_modalities)
      ? raw.input_modalities.filter((modality): modality is string => typeof modality === 'string')
      : undefined
    const projectedToolCalling = typeof raw.tool_calling === 'boolean' ? raw.tool_calling : undefined
    const projectedReasoning = typeof raw.reasoning === 'boolean' ? raw.reasoning : undefined
    const limit = typeof raw.limit === 'object' && raw.limit !== null ? (raw.limit as Record<string, unknown>) : {}
    const contextWindow = projectedContextWindow ?? positiveInteger(limit.context)
    const maxOutputTokens = projectedMaxOutputTokens ?? positiveInteger(limit.output)
    const explicitMaxInputTokens = projectedMaxInputTokens ?? positiveInteger(limit.input)
    const maxInputTokens =
      explicitMaxInputTokens ??
      (contextWindow !== undefined
        ? maxOutputTokens !== undefined && contextWindow > maxOutputTokens
          ? contextWindow - maxOutputTokens
          : contextWindow
        : undefined)
    const modalities =
      typeof raw.modalities === 'object' && raw.modalities !== null
        ? (raw.modalities as Record<string, unknown>).input
        : undefined
    const inputModalities =
      projectedModalities ??
      (Array.isArray(modalities) ? modalities.filter((modality): modality is string => typeof modality === 'string') : undefined)
    const toolCalling = projectedToolCalling ?? (typeof raw.tool_call === 'boolean' ? raw.tool_call : undefined)
    const reasoning = projectedReasoning ?? (typeof raw.reasoning === 'boolean' ? raw.reasoning : undefined)
    const profile: Partial<ModelProfile> = {
      ...(contextWindow !== undefined ? { contextWindow } : {}),
      ...(maxInputTokens !== undefined ? { maxInputTokens } : {}),
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
      ...(inputModalities !== undefined ? { inputModalities } : {}),
      ...(toolCalling !== undefined ? { toolCalling } : {}),
      ...(reasoning !== undefined ? { reasoning } : {}),
    }
    if (Object.keys(profile).length === 0) continue

    const modelId = canonicalId.slice(canonicalId.lastIndexOf('/') + 1)
    if (ambiguous.has(modelId)) continue
    if (index.has(modelId)) {
      index.delete(modelId)
      ambiguous.add(modelId)
    } else {
      index.set(modelId, profile)
    }
  }
  return index
}

export async function fetchModelProfiles(client: ModelflareClient, signal?: AbortSignal): Promise<ModelProfileIndex> {
  const body = await client.json<{ data?: unknown }>(MODEL_PROFILES_PATH, {
    method: 'GET',
    ...(signal ? { signal } : {}),
  })
  const profiles = buildModelProfileIndex(body.data)
  if (profiles.size === 0) throw new Error('The Modelflare model profile catalog is unavailable')
  return profiles
}

function candidatesFor(modelId: string): string[] {
  const candidates = [modelId]
  const baseVariant = modelId.replace(/-(?:high|medium|low)$/u, '')
  if (baseVariant !== modelId) candidates.push(baseVariant)
  return candidates
}

export function resolveModelProfile(modelId: string, profiles: ModelProfileIndex = new Map()): ModelProfile {
  const fallback = FAMILY_PROFILES.find(([pattern]) => pattern.test(modelId))?.[1] ?? DEFAULT_PROFILE
  const discovered = candidatesFor(modelId)
    .map((candidate) => profiles.get(candidate))
    .find((candidate) => candidate !== undefined)
  return {
    contextWindow: discovered?.contextWindow ?? fallback.contextWindow,
    maxInputTokens: discovered?.maxInputTokens ?? fallback.maxInputTokens,
    maxOutputTokens: discovered?.maxOutputTokens ?? fallback.maxOutputTokens,
    inputModalities: discovered?.inputModalities ?? fallback.inputModalities,
    toolCalling: discovered?.toolCalling ?? fallback.toolCalling,
    reasoning: discovered?.reasoning ?? fallback.reasoning,
  }
}
