/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryType } from "@/types/api";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";
import { CancelledError, handleRequestError } from "@/utils/errors";
import { createTimer } from "@/utils/logger";

/**
 * Abstract base for dictionary providers.
 *
 * Template method pattern:
 * - `request()` is the public entry point — handles cancellation and error normalization
 * - `doQuery()` is implemented by each subclass with the actual API call
 *
 * Returns `DictionaryResult` (with `displaySections` pre-computed) because dictionary
 * display logic is provider-specific (Linguee: formatLingueeDisplaySections,
 * Youdao: formatYoudaoDisplaySections).
 */
export abstract class BaseDictionaryProvider<T = unknown> {
  abstract type: DictionaryType;

  public request = async (queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryResult<T>> => {
    const timer = createTimer(this.type);
    try {
      const result = await this.doQuery(queryWordInfo, options);
      const sectionCount = result.displaySections?.length ?? 0;
      timer.done(sectionCount > 0 ? `${sectionCount} sections` : "no entries");
      return result;
    } catch (error) {
      const requestError = handleRequestError(this.type, error, options?.signal);
      if (!(requestError instanceof CancelledError)) {
        timer.fail();
      }
      throw requestError;
    }
  };

  protected abstract doQuery(queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryResult<T>>;
}
