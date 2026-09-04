import { getLegacyAIProviderReplacement } from "@/ai-providers/legacy";
import type { AIProviderProfile, LegacyAIProviderName, StoredAIProviderStateV1 } from "@/ai-providers/types";
import { DictionaryType, TranslationType } from "@/types/api";

export type BuiltinProviderCategory = "dictionary" | "translation";

export interface ProviderOrderCandidate {
  providerKey: string;
  type: string;
  serviceOrder: number;
  profileOrder?: number;
}

export interface ProviderOrderService {
  providerKey: string;
  type: string;
  order: number;
}

export function getBuiltinProviderCandidates(services: ProviderOrderService[]): ProviderOrderCandidate[] {
  return services.map(({ providerKey, type, order }) => ({ providerKey, type, serviceOrder: order }));
}

const defaultTypeOrder = [
  DictionaryType.Youdao,
  DictionaryType.Linguee,
  DictionaryType.AI,
  TranslationType.OpenAI,
  TranslationType.Gemini,
  TranslationType.DeepL,
  TranslationType.DeepLX,
  TranslationType.Google,
  TranslationType.Bing,
  TranslationType.Apple,
  TranslationType.Baidu,
  TranslationType.Tencent,
  TranslationType.Volcano,
  TranslationType.Youdao,
  TranslationType.Caiyun,
];

export function getBuiltinProviderKey(category: BuiltinProviderCategory, type: string): string {
  return `builtin:${category}:${type}`;
}

export function getLegacyAIProviderKey(provider: LegacyAIProviderName): string {
  const type = provider === "openai" ? TranslationType.OpenAI : TranslationType.Gemini;
  return getBuiltinProviderKey("translation", type);
}

export function getAIProviderKey(
  profile: AIProviderProfile,
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): string {
  const replacement = getLegacyAIProviderReplacement(profile.id, assignments);
  if (replacement) return getLegacyAIProviderKey(replacement);
  return `ai:${profile.id}`;
}

export function getProviderOrderCandidates(
  profiles: AIProviderProfile[],
  builtinCandidates: ProviderOrderCandidate[] = [],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): ProviderOrderCandidate[] {
  const candidates = [...builtinCandidates];
  const staticKeys = new Set(candidates.map((candidate) => candidate.providerKey));

  for (const profile of profiles) {
    const providerKey = getAIProviderKey(profile, assignments);
    if (staticKeys.has(providerKey)) continue;
    candidates.push({
      providerKey,
      type: profile.wordResultMode === "dictionary" ? DictionaryType.AI : TranslationType.OpenAI,
      serviceOrder: profile.order,
      profileOrder: profile.order,
    });
  }

  return candidates;
}

export function getAvailableProviderKeys(
  profiles: AIProviderProfile[],
  builtinCandidates: ProviderOrderCandidate[] = [],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): string[] {
  return getProviderOrderCandidates(profiles, builtinCandidates, assignments).map((candidate) => candidate.providerKey);
}

export function getLegacyServiceTypeOrder(servicesOrder: string[]): string[] {
  const defaultOrders = defaultTypeOrder.map((type) => type.toLowerCase());
  const userOrder: string[] = [];

  for (const rawOrder of servicesOrder) {
    const order = rawOrder.trim().toLowerCase();
    if (!order) continue;

    const dictionaryName = order;
    if (dictionaryName.endsWith("dictionary")) {
      if (defaultOrders.includes(dictionaryName)) {
        userOrder.push(dictionaryName);
        defaultOrders.splice(defaultOrders.indexOf(dictionaryName), 1);
      }
      continue;
    }

    const translationName = `${order} translate`;
    if (defaultOrders.includes(translationName)) {
      userOrder.push(translationName);
      defaultOrders.splice(defaultOrders.indexOf(translationName), 1);
    }
  }

  return [...userOrder, ...defaultOrders];
}

export function getInitialProviderOrder(candidates: ProviderOrderCandidate[], servicesOrder: string[]): string[] {
  const typeOrder = getLegacyServiceTypeOrder(servicesOrder);
  const typeRank = new Map(typeOrder.map((type, index) => [type, index]));
  const deduped = new Map<string, ProviderOrderCandidate>();

  for (const candidate of candidates) {
    const existing = deduped.get(candidate.providerKey);
    if (!existing || compareCandidates(candidate, existing, typeRank) < 0) {
      deduped.set(candidate.providerKey, candidate);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => compareCandidates(left, right, typeRank))
    .map((candidate) => candidate.providerKey);
}

function compareCandidates(
  left: ProviderOrderCandidate,
  right: ProviderOrderCandidate,
  typeRank: Map<string, number>,
): number {
  return (
    (typeRank.get(left.type.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
      (typeRank.get(right.type.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) ||
    left.serviceOrder - right.serviceOrder ||
    (left.profileOrder ?? Number.MAX_SAFE_INTEGER) - (right.profileOrder ?? Number.MAX_SAFE_INTEGER)
  );
}

export function reconcileProviderOrder(
  savedOrder: string[] | undefined,
  availableKeys: string[],
  fallbackOrder: string[],
): string[] {
  const available = new Set(availableKeys);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const key of savedOrder ?? []) {
    if (available.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const key of fallbackOrder) {
    if (available.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  for (const key of availableKeys) {
    if (!seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  return result;
}

export function reconcileAIProviderReplacementOrder(
  providerOrder: string[],
  profile: AIProviderProfile,
  previousReplacement: LegacyAIProviderName | undefined,
  nextReplacement: LegacyAIProviderName | undefined,
): string[] {
  if (previousReplacement === nextReplacement) return providerOrder;
  const nextOrder = providerOrder.filter((key) => key !== getAIProviderKey(profile));
  if (nextReplacement || !previousReplacement) return nextOrder;

  const legacyIndex = nextOrder.indexOf(getLegacyAIProviderKey(previousReplacement));
  nextOrder.splice(legacyIndex < 0 ? nextOrder.length : legacyIndex + 1, 0, getAIProviderKey(profile));
  return nextOrder;
}

export function getProviderOrder(
  profiles: AIProviderProfile[],
  savedOrder: string[] | undefined,
  servicesOrder: string[] = [],
  builtinCandidates: ProviderOrderCandidate[] = [],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): string[] {
  const candidates = getProviderOrderCandidates(profiles, builtinCandidates, assignments);
  const fallbackOrder = getInitialProviderOrder(candidates, servicesOrder);
  return reconcileProviderOrder(
    savedOrder,
    candidates.map((candidate) => candidate.providerKey),
    fallbackOrder,
  );
}

export function assignGlobalServiceOrder<T extends { providerKey: string; order: number }>(
  services: T[],
  providerOrder: string[],
): T[] {
  const orderByKey = new Map(providerOrder.map((key, index) => [key, index]));
  return services.map((service, index) => ({
    ...service,
    order: orderByKey.get(service.providerKey) ?? providerOrder.length + index,
  }));
}

export function syncAIProviderOrders(
  profiles: AIProviderProfile[],
  providerOrder: string[],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): AIProviderProfile[] {
  const profileKeys = new Set(profiles.map((profile) => getAIProviderKey(profile, assignments)));
  const orderByKey = new Map<string, number>();
  let profileOrder = 0;
  for (const key of providerOrder) {
    if (profileKeys.has(key)) {
      orderByKey.set(key, profileOrder);
      profileOrder += 1;
    }
  }

  return profiles.map((profile) => ({
    ...profile,
    order: orderByKey.get(getAIProviderKey(profile, assignments)) ?? profile.order,
  }));
}
