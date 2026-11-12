/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryContent } from "@/core/content/types";
import type { DictionaryType } from "@/core/results/kinds";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/core/results/types";
import { CancelledError, handleRequestError } from "@/shared/errors";
import { createTimer } from "@/shared/logger";

type DictionaryLookup = DictionaryContent | Omit<DictionaryResult, "type">;

/**
 * Abstract base for dictionary providers.
 *
 * Template method pattern:
 * - `request()` is the public entry point — handles cancellation and error normalization
 * - `doQuery()` is implemented by each subclass with the actual API call
 */
export abstract class BaseDictionaryProvider {
  abstract type: DictionaryType;

  protected get logLabel(): string {
    return this.type;
  }

  public request = async (queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryResult> => {
    const timer = createTimer(this.logLabel);
    try {
      const lookup = await this.doQuery(queryWordInfo, options);
      const result = "content" in lookup ? lookup : { content: lookup };
      const sectionCount = result.content.sections.length;
      timer.done(sectionCount > 0 ? `${sectionCount} sections` : "no entries");
      return { type: this.type, ...result };
    } catch (error) {
      const requestError = handleRequestError(this.type, error, options?.signal, this.logLabel);
      if (!(requestError instanceof CancelledError)) {
        timer.fail();
      }
      throw requestError;
    }
  };

  protected abstract doQuery(queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryLookup>;
}
