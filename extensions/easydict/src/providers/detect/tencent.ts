/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getYoudaoLangCode, tencentDetectMap } from "@/core/language/utils";
import { hasTencentAppKey } from "@/providers/shared/config";
import { type TencentError, tencentSign } from "@/providers/shared/tencent-sign";
import { LanguageDetectType } from "@/types/api";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logWarn } from "@/utils/logger";

import type { DetectOptions } from "./base";
import { BaseDetectProvider } from "./base";

interface LanguageDetectResponse {
  /**
   * 识别出的语言种类，参考语言列表
   *  zh : 中文; en : 英文; jp : 日语; kr : 韩语; de : 德语;
   *  fr : 法语;es : 西班牙文; it : 意大利文 ; tr : 土耳其文;
   *  ru : 俄文; pt : 葡萄牙文; vi : 越南文 ; id : 印度尼西亚文;
   *  ms : 马来西亚文; th : 泰文
   */
  Lang?: string;
  /**
   * 唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。
   */
  RequestId?: string;
}

interface TencentDetectResult extends LanguageDetectResponse {
  Error?: TencentError;
}

export class TencentDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Tencent;

  isEnabled(): boolean {
    if (!hasTencentAppKey()) {
      logWarn(this.type, "detect has no app key");
      return false;
    }
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions) {
    const payload = { Text: text, ProjectId: 0 };

    const { url, headers } = tencentSign("LanguageDetect", payload);

    const data = await timedFetch<{ Response: TencentDetectResult }>(url, {
      method: "POST",
      body: payload,
      headers,
      signal: options?.signal,
    });

    const response = data.Response;

    const error = response.Error;
    if (error) {
      logError(this.type, `detect error: ${error.Message}`);
      throw new RequestError(LanguageDetectType.Tencent, error.Message);
    }

    const tencentLanguageId = response.Lang || "";
    const youdaoLanguageId = getYoudaoLangCode(tencentLanguageId, tencentDetectMap);

    return {
      type: LanguageDetectType.Tencent,
      sourceLangCode: tencentLanguageId,
      youdaoLangCode: youdaoLanguageId,
      confirmed: false,
    };
  }
}
