/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DetectedLangModel } from "@/core/detect/types";
import type { LanguageDetectType } from "@/types/api";
import { CancelledError, handleRequestError } from "@/utils/errors";
import { createTimer } from "@/utils/logger";

/**
 * Abstract base for language detection providers.
 *
 * Template method pattern:
 * - `detect()` is the public entry point — handles cancellation and error normalization
 * - `doDetect()` is implemented by each subclass with the actual detection logic
 */
export interface DetectOptions {
  confirmedConfidence?: number;
  signal?: AbortSignal;
}

export abstract class BaseDetectProvider<T = unknown> {
  abstract type: LanguageDetectType;

  /** Indicates if this is a local offline detector (like Franc) vs a network API */
  public isLocal = false;

  abstract isEnabled(): boolean;

  public detect = async (text: string, options?: DetectOptions): Promise<DetectedLangModel<T>> => {
    const timer = createTimer(this.type);
    try {
      const result = await this.doDetect(text, options);
      const confidence = result.confirmed ? "confirmed" : "unconfirmed";
      timer.done(`${result.youdaoLangCode} (${confidence})`);
      return result;
    } catch (error) {
      const requestError = handleRequestError(this.type, error, options?.signal);
      if (!(requestError instanceof CancelledError)) {
        timer.fail();
      }
      throw requestError;
    }
  };

  protected abstract doDetect(text: string, options?: DetectOptions): Promise<DetectedLangModel<T>>;
}
