import { environment, getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

/**
 * The local VerWatch (through its tunnel) while the extension runs from
 * source with `ray develop`; verwatch.com once installed from the Store.
 */
export function baseUrl(): string {
  return environment.isDevelopment
    ? "https://dev.verwatch.com"
    : "https://verwatch.com";
}

/**
 * Signs in with VerWatch's own OAuth server. Raycast identifies itself with
 * its published Client ID Metadata Document, which VerWatch fetches and
 * trusts for its com.raycast:/oauth redirect, so there is no client to
 * register. A personal API token in preferences skips the sign-in.
 */
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.ClientIdMetadataDocument,
  providerName: "VerWatch",
  providerIcon: "verwatch.png",
  providerId: "verwatch",
  description: "Sign in to VerWatch to see your projects and start updates.",
});

export const verwatch = new OAuthService({
  client,
  clientId: OAuth.clientIdMetadataDocument,
  scope: "read write",
  authorizeUrl: `${baseUrl()}/oauth/authorize`,
  tokenUrl: `${baseUrl()}/oauth/token`,
  bodyEncoding: "url-encoded",
  personalAccessToken:
    getPreferenceValues<Preferences>().apiToken?.trim() || undefined,
});
