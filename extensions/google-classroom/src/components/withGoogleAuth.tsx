import { WithAccessTokenComponentOrFn, withAccessToken } from "@raycast/utils";
import { google } from "../api/googleAuth";

export function withGoogleAuth(componentOrFn: WithAccessTokenComponentOrFn) {
  return withAccessToken(google)(componentOrFn);
}
