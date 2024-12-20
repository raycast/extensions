import { getPreferenceValues, OAuth } from "@raycast/api";
import { Constants } from "../utils/constants";
import { OAuthService } from "@raycast/utils";

const logo_name = `${Constants.CW_LOGO_NAME}`;
const clientId = `${Constants.CW_OAUTH_CL_ID}`;
const scope = `${Constants.CW_OAUTH_SCOPE}`;

const { useChatworkApiKey, chatworkApiKey } = getPreferenceValues<Preferences>();

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: `${Constants.CW_OAUTH_PROVIDER_NAME}`,
  providerIcon: logo_name,
  description: `${Constants.CW_OAUTH_DESCRIPTION}`,
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId,
  scope,
  authorizeUrl: Constants.CW_OAUTH_LOGIN,
  tokenUrl: Constants.CW_OAUTH_TOKEN,
  personalAccessToken: useChatworkApiKey ? chatworkApiKey : undefined,
  bodyEncoding: "url-encoded",
});
