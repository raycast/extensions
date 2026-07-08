import { OAuth, Detail, LaunchProps, WindowManagement, getPreferenceValues, LocalStorage } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils";
import { Resend } from "resend";

const {api_key} = getPreferenceValues<Preferences>();
const clientId = "161e7b77-a7ec-4cda-b186-29e2060a8d74";
let resendClient: Resend | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Resend",
  providerIcon: "resend-extension_icon.png",
  providerId: "resend",
  description: "Connect your Resend account",
});

const provider = new OAuthService({
    client,
    clientId: clientId,
    scope: "full_access",
    authorizeUrl: "https://api.resend.com/oauth/authorize",
    tokenUrl: "https://api.resend.com/oauth/token",
    // personalAccessToken: api_key,
    onAuthorize({ token }) {
        resendClient = new Resend(token);
    },
});

export function withResendClient<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(provider)(Component);
}

export function getResendClient() {
  if (!resendClient) {
    throw new Error("No resend client initialized");
  }

  return resendClient;
}

// function AuthorizedComponent(props: LaunchProps) {
//   const { token } = getAccessToken();
//   return <Detail markdown={`Access token: ${token}`} />;
// }

// export default withAccessToken(provider)(AuthorizedComponent);

const r = async () => {
    if (!api_key) {
        const oauth_details = await LocalStorage.getItem<string>("OAUTH-DETAILS");
        
        const response = await fetch("https://api.resend.com/oauth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_name: "Raycast OAuth Client",
                redirect_uris: ["https://raycast.com/redirect?packageName=Extension"],
                grant_types: ["authorization_code", "refresh_token"],
                response_types: ["code"],
                token_endpoint_auth_method: "none",
                // scope: "emails:send"
            })
        })
    }
}