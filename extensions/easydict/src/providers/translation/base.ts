/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import type { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions, StreamChunk, TranslationResult } from "@/core/results/types";
import { CancelledError, handleRequestError } from "@/shared/errors";
import { createTimer } from "@/shared/logger";

type TranslationGenerator = AsyncGenerator<StreamChunk, TranslationContent, unknown>;

/**
 * Abstract base for translation providers.
 *
 * Template method pattern:
 * - `request()` is the public entry point and always exposes an async generator.
 * - Protocol-specific subclasses adapt Promise and streaming implementations.
 * - Provider implementations only implement their correctly typed `doTranslate()` method.
 */
export abstract class BaseTranslateProvider {
  abstract type: TranslationType;

  protected get logLabel(): string {
    return this.type;
  }

  public async *request(
    queryWordInfo: QueryInput,
    options?: RequestOptions,
  ): AsyncGenerator<StreamChunk, TranslationResult, unknown> {
    const timer = createTimer(this.logLabel);
    try {
      const result = yield* this.performTranslate(queryWordInfo, options);
      timer.done(result.paragraphs.join(", "));
      return { type: this.type, content: result };
    } catch (error) {
      const requestError = handleRequestError(this.type, error, options?.signal, this.logLabel);
      if (!(requestError instanceof CancelledError)) {
        timer.fail();
      }
      throw requestError;
    }
  }

  protected abstract performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator;
}

export abstract class BaseNonStreamingTranslateProvider extends BaseTranslateProvider {
  protected async *performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator {
    // Non-streaming providers intentionally emit no intermediate chunks.
    yield* [];
    return await this.doTranslate(queryWordInfo, options);
  }

  protected abstract doTranslate(queryWordInfo: QueryInput, options?: RequestOptions): Promise<TranslationContent>;
}

export abstract class BaseStreamingTranslateProvider extends BaseTranslateProvider {
  protected performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator {
    return this.doTranslate(queryWordInfo, options);
  }

  protected abstract doTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator;
}
