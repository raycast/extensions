/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { getLanguageItem } from "@/core/language/utils";

const preferredLanguage1 = getLanguageItem(myPreferences.language1);
const preferredLanguage2 = getLanguageItem(myPreferences.language2);

export const config = {
  preferredLanguage1,
  preferredLanguage2,
  preferredLanguages: [preferredLanguage1, preferredLanguage2],
  servicesOrder: myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [],
  enableDetectLanguageSpeedFirst: myPreferences.enableDetectLanguageSpeedFirst,
};
