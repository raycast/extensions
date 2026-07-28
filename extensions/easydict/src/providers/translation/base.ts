/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions, StreamChunk, TranslationResult } from "@/types/query";
import { CancelledError, handleRequestError } from "@/utils/errors";
import { createTimer } from "@/utils/logger";

type TranslationGenerator<T> = AsyncGenerator<StreamChunk, TranslationResult<T>, unknown>;

/**
 * Abstract base for translation providers.
 *
 * Template method pattern:
 * - `request()` is the public entry point and always exposes an async generator.
 * - Protocol-specific subclasses adapt Promise and streaming implementations.
 * - Provider implementations only implement their correctly typed `doTranslate()` method.
 */
export abstract class BaseTranslateProvider<T = unknown> {
  abstract type: TranslationType;

  public async *request(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator<T> {
    const timer = createTimer(this.type);
    try {
      const result = yield* this.performTranslate(queryWordInfo, options);
      timer.done(result.translations.join(", "));
      return result;
    } catch (error) {
      const requestError = handleRequestError(this.type, error, options?.signal);
      if (!(requestError instanceof CancelledError)) {
        timer.fail();
      }
      throw requestError;
    }
  }

  protected abstract performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator<T>;
}

export abstract class BaseNonStreamingTranslateProvider<T = unknown> extends BaseTranslateProvider<T> {
  protected async *performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator<T> {
    // Non-streaming providers intentionally emit no intermediate chunks.
    yield* [];
    return await this.doTranslate(queryWordInfo, options);
  }

  protected abstract doTranslate(queryWordInfo: QueryInput, options?: RequestOptions): Promise<TranslationResult<T>>;
}

export abstract class BaseStreamingTranslateProvider<T = unknown> extends BaseTranslateProvider<T> {
  protected performTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator<T> {
    return this.doTranslate(queryWordInfo, options);
  }

  protected abstract doTranslate(queryWordInfo: QueryInput, options?: RequestOptions): TranslationGenerator<T>;
}
