/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { LanguageDetectType } from "@/types/api";
import type { BooleanPreferenceKey } from "@/types/preferences";

import { BaiduDetectProvider } from "./baidu";
import type { BaseDetectProvider } from "./base";
import { BingDetectProvider } from "./bing";
import { FrancDetectProvider } from "./franc";
import { TencentDetectProvider } from "./tencent";
import { VolcanoDetectProvider } from "./volcano";

export interface DetectServiceConfig {
  type: LanguageDetectType;
  preference?: BooleanPreferenceKey;
  provider: new () => BaseDetectProvider;
}

/** Static registry — detect provider classes, instantiated by the engine. */
export const detectServices: DetectServiceConfig[] = [
  { type: LanguageDetectType.Bing, provider: BingDetectProvider },
  { type: LanguageDetectType.Baidu, preference: "enableBaiduLanguageDetect", provider: BaiduDetectProvider },
  { type: LanguageDetectType.Tencent, preference: "enableTencentLanguageDetect", provider: TencentDetectProvider },
  { type: LanguageDetectType.Volcano, preference: "enableVolcanoLanguageDetect", provider: VolcanoDetectProvider },
  { type: LanguageDetectType.Franc, provider: FrancDetectProvider },
];
