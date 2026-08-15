import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const OLD_OAUTH_ID = "76a7c93f-0834-41ba-82a5-e23e771fb19f";
const NEW_OAUTH_ID = "59e5ecce-9dc8-4881-89c8-98d44be1e68a";
const {
  airtableOAuthClientId: CURRENT_OAUTH_ID,
  airtableUiBaseUrl,
  airtablePersonalAccessToken,
} = getPreferenceValues<Preferences>();
const scopes = ["schema.bases:read", "data.records:read", "data.records:write"];

// Since the previous ID was set as "default" in Airtable, when old users update the extension they will still get the old ID
// So we check if the ID is the old one, then it needs to be updated to the new one
const airtableOAuthClientId = CURRENT_OAUTH_ID === OLD_OAUTH_ID ? NEW_OAUTH_ID : CURRENT_OAUTH_ID;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Airtable",
  providerIcon: "airtable-logo.png",
  providerId: "airtable",
  description: "Connect your Airtable account",
});

export const provider = new OAuthService({
  client,
  clientId: airtableOAuthClientId,
  scope: scopes.join(" "),
  authorizeUrl: `${airtableUiBaseUrl}/oauth2/v1/authorize`,
  tokenUrl: `${airtableUiBaseUrl}/oauth2/v1/token`,
  bodyEncoding: "url-encoded",
  personalAccessToken: airtablePersonalAccessToken,
});
