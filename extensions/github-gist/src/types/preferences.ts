import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  personalAccessTokens: string;
  perPage: string;
  rememberTag: boolean;
  showDetail: boolean;
  primaryAction: string;
}
export const { personalAccessTokens, perPage, rememberTag, showDetail, primaryAction } =
  getPreferenceValues<Preferences>();
