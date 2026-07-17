import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { Dropbox } from "dropbox";

const { dropbox_access_token } = getPreferenceValues<Preferences>();

let dropbox: Dropbox | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dropbox",
  providerIcon: "dropbox.png",
  description: "Connect your Dropbox account",
});

export const provider = new OAuthService({
  client,
  clientId: "8tisoiv3j5fn8ts",
  scope: "account_info.read files.metadata.read files.content.read",
  authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://www.dropbox.com/oauth2/token",
  extraParameters: { token_access_type: "offline" },
  personalAccessToken: dropbox_access_token,
  onAuthorize({ token }) {
    dropbox = new Dropbox({ accessToken: token });
  },
  bodyEncoding: "url-encoded",
});

export const getDropboxClient = () => {
  if (!dropbox) throw new Error("No Dropbox client initialized");
  return dropbox;
};
