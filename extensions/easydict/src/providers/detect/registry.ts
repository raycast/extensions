/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";

import { LanguageDetectType } from "@/core/results/kinds";
import { hasVolcanoAppKey } from "@/providers/shared/config";
import { logWarn } from "@/shared/logger";

import { BaiduDetectProvider } from "./baidu";
import type { BaseDetectProvider } from "./base";
import { BingDetectProvider } from "./bing";
import { FrancDetectProvider } from "./franc";
import { VolcanoDetectProvider } from "./volcano";

export function createEnabledDetectors(): BaseDetectProvider[] {
  const preferences = getPreferenceValues<Preferences>();
  const providers: BaseDetectProvider[] = [new BingDetectProvider()];
  if (preferences.enableBaiduLanguageDetect) providers.push(new BaiduDetectProvider());
  if (preferences.enableVolcanoLanguageDetect) {
    if (hasVolcanoAppKey()) providers.push(new VolcanoDetectProvider());
    else logWarn(LanguageDetectType.Volcano, "detect has no app key");
  }
  providers.push(new FrancDetectProvider());
  return providers;
}
