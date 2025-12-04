import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  "access-token": string;
  perPage: string;
  "remember-tag": boolean;
  detail: boolean;
  defaultGistTag: string;
  primaryAction: string;
}
export const {
  "access-token": personalAccessTokens,
  perPage,
  "remember-tag": rememberTag,
  detail: showDetail,
  defaultGistTag: defaultGistTag,
  primaryAction,
} = getPreferenceValues<Preferences>();
