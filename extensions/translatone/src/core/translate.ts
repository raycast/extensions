import { requestCompletion, type Fetch } from "./chat-client";
import {
  AllProvidersFailedError,
  EmptyTextError,
  NoProviderConfiguredError,
  ProviderError,
} from "./errors";
import type { ProviderConfig } from "./providers";
import {
  parseDirectionTag,
  type Direction,
  type TaggedReply,
  type TranslationTarget,
} from "./target";
import { buildSystemPrompt, type ToneId } from "./tones";
import { incrementUsage, readUsage, type KeyValueStore, type UsageSnapshot } from "./usage";

export interface TranslationRequest {
  readonly text: string;
  readonly tone: ToneId;
  readonly target: TranslationTarget;
  readonly signal?: AbortSignal | undefined;
  readonly onPartial?: ((partial: TaggedReply) => void) | undefined;
}

export interface TranslationDependencies {
  readonly providers: readonly ProviderConfig[];
  readonly store: KeyValueStore;
  readonly fetch: Fetch;
  readonly now?: () => Date;
}

export interface TranslationResult {
  readonly text: string;
  readonly direction: Direction | undefined;
  readonly provider: ProviderConfig;
  readonly usage: UsageSnapshot;
  readonly durationMs: number;
  readonly requestId: string | undefined;
  readonly skipped: readonly ProviderError[];
}

export async function translate(
  request: TranslationRequest,
  dependencies: TranslationDependencies,
): Promise<TranslationResult> {
  const text = request.text.trim();
  if (text === "") {
    throw new EmptyTextError();
  }
  if (dependencies.providers.length === 0) {
    throw new NoProviderConfiguredError();
  }

  const now = dependencies.now ?? (() => new Date());
  const systemPrompt = buildSystemPrompt(request.tone, request.target);
  const skipped: ProviderError[] = [];
  const { onPartial } = request;
  const onDelta = onPartial && ((raw: string) => onPartial(parseDirectionTag(raw)));

  for (const provider of dependencies.providers) {
    const usage = await readUsage(dependencies.store, provider, now());
    if (usage.remaining === 0) {
      skipped.push(
        new ProviderError(provider.id, "limit_reached", `Used ${usage.used} of ${usage.limit}.`),
      );
      continue;
    }

    const startedAt = performance.now();
    try {
      const completion = await requestCompletion(
        dependencies.fetch,
        {
          provider,
          systemPrompt,
          text,
          signal: request.signal,
        },
        { onDelta },
      );
      return {
        ...parseDirectionTag(completion.text),
        provider,
        usage: await incrementUsage(dependencies.store, provider, now()),
        durationMs: Math.round(performance.now() - startedAt),
        requestId: completion.requestId,
        skipped,
      };
    } catch (error) {
      if (!(error instanceof ProviderError) || !error.recoverable) {
        throw error;
      }
      skipped.push(error);
    }
  }

  throw new AllProvidersFailedError(skipped);
}

export function visibleTranslation(
  finished: string | undefined,
  streamed: string,
  isLoading: boolean,
): string {
  if (isLoading && streamed !== "") {
    return streamed;
  }
  return finished ?? streamed;
}
