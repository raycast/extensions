import { PreferenceValues } from "@raycast/api";

export interface Preferences extends PreferenceValues {
  miteApiServer: string;
  miteApiKey: string;
  excludedTerms: string;
}
