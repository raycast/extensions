import { translationKey } from "./detail";
import type { ProviderConfig } from "./providers";
import { translate, type TranslationDependencies, type TranslationRequest, type TranslationResult } from "./translate";

export interface TranslationAttempt {
  readonly key: string;
  readonly providers: readonly ProviderConfig[];
  readonly generation: number;
}

export interface AttemptResult {
  readonly key: string;
  readonly generation: number;
  readonly result: TranslationResult;
}

export function startTranslationAttempt(
  key: string,
  providers: readonly ProviderConfig[],
  previous: TranslationAttempt | undefined,
): TranslationAttempt {
  return { key, providers, generation: (previous?.generation ?? 0) + 1 };
}

export async function runTranslationAttempt(
  request: TranslationRequest,
  dependencies: TranslationDependencies,
  cache: ReadonlyMap<string, TranslationResult>,
  attempt: TranslationAttempt | undefined,
): Promise<AttemptResult> {
  const key = translationKey(request.text, request.target, request.tone, dependencies.providers);
  const retry = attempt?.key === key ? attempt : undefined;
  const cached = retry ? undefined : cache.get(key);
  return {
    key,
    generation: retry?.generation ?? 0,
    result:
      cached ?? (await translate(request, { ...dependencies, providers: retry?.providers ?? dependencies.providers })),
  };
}
