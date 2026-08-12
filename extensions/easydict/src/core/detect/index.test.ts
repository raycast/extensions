import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectedLangModel } from "@/core/detect/types";
import { BaseDetectProvider, type DetectOptions } from "@/providers/detect/base";
import type { DetectServiceConfig } from "@/providers/detect/registry";
import { LanguageDetectType } from "@/types/api";
import { CancelledError } from "@/utils/errors";

import { detectLanguage } from "./index";

const testDoubles = vi.hoisted(() => ({
  detectServices: [] as DetectServiceConfig[],
  loserAborted: vi.fn(),
  logError: vi.fn(),
  timerFail: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
}));

vi.mock("@/core/config", () => ({
  config: {
    enableDetectLanguageSpeedFirst: false,
    preferredLanguages: [{ youdaoLangCode: "en" }, { youdaoLangCode: "zh-CHS" }],
  },
}));

vi.mock("@/providers/detect/registry", () => ({
  detectServices: testDoubles.detectServices,
}));

vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: testDoubles.timerFail }),
  logError: testDoubles.logError,
  logSummary: vi.fn(),
  logTrace: vi.fn(),
}));

class CancelledRemoteDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Bing;

  isEnabled() {
    return true;
  }

  protected async doDetect(): Promise<DetectedLangModel> {
    throw new CancelledError();
  }
}

class CancelledLocalDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Franc;
  isLocal = true;

  isEnabled() {
    return true;
  }

  protected async doDetect(): Promise<DetectedLangModel> {
    throw new CancelledError();
  }
}

class FirstConsensusDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Baidu;

  isEnabled() {
    return true;
  }

  protected async doDetect(): Promise<DetectedLangModel> {
    return {
      type: this.type,
      sourceLangCode: "en",
      youdaoLangCode: "en",
      confirmed: false,
    };
  }
}

class WinningConsensusDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Tencent;

  isEnabled() {
    return true;
  }

  protected async doDetect(): Promise<DetectedLangModel> {
    return {
      type: this.type,
      sourceLangCode: "en",
      youdaoLangCode: "en",
      confirmed: false,
    };
  }
}

class LosingDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Bing;

  isEnabled() {
    return true;
  }

  protected doDetect(_text: string, options?: DetectOptions): Promise<DetectedLangModel> {
    return new Promise((_, reject) => {
      const handleAbort = () => {
        testDoubles.loserAborted();
        reject(new DOMException("This operation was aborted", "AbortError"));
      };

      if (options?.signal?.aborted) {
        handleAbort();
      } else {
        options?.signal?.addEventListener("abort", handleAbort, { once: true });
      }
    });
  }
}

beforeEach(() => {
  testDoubles.loserAborted.mockReset();
  testDoubles.logError.mockReset();
  testDoubles.timerFail.mockReset();
  testDoubles.detectServices.splice(
    0,
    testDoubles.detectServices.length,
    { type: LanguageDetectType.Bing, provider: CancelledRemoteDetectProvider },
    { type: LanguageDetectType.Franc, provider: CancelledLocalDetectProvider },
  );
});

describe("detectLanguage cancellation", () => {
  it("cancels unfinished remote detectors after a confirmed result wins", async () => {
    testDoubles.detectServices.splice(
      0,
      testDoubles.detectServices.length,
      { type: LanguageDetectType.Baidu, provider: FirstConsensusDetectProvider },
      { type: LanguageDetectType.Tencent, provider: WinningConsensusDetectProvider },
      { type: LanguageDetectType.Bing, provider: LosingDetectProvider },
    );

    const result = await detectLanguage("testimony");

    expect(result.type).toBe(LanguageDetectType.Tencent);
    expect(testDoubles.loserAborted).toHaveBeenCalledOnce();
    expect(testDoubles.logError).not.toHaveBeenCalled();
    expect(testDoubles.timerFail).not.toHaveBeenCalled();
  });

  it("stops detection when the query signal is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = detectLanguage("testimony", controller.signal);

    await expect(result).rejects.toBeInstanceOf(CancelledError);
    expect(testDoubles.logError).not.toHaveBeenCalled();
  });
});
