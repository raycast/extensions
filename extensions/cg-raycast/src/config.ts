import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  BASE_URL: string;
}

export const CG_BASE_URL = getPreferenceValues<Preferences>().BASE_URL || "https://rwcg.realtong.cn";
