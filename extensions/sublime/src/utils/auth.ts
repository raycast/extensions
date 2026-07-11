import { OAuth, popToRoot } from "@raycast/api";
import { webUrl } from "./constants";
import { getAccessToken, OAuthService } from "@raycast/utils";

const oauthClient = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.App,
    providerName: "Sublime",
    providerIcon: "icon.png",
    providerId: "sublime",
    description: "Log in with your Sublime account",
});

let isFirstTokenCall = false;

export const authService = new OAuthService({
    client: oauthClient,
    clientId: "raycast",
    scope: "",
    authorizeUrl: `${webUrl}/login`,
    tokenUrl: `${webUrl}/pkce-token`,
    refreshTokenUrl: `${webUrl}/pkce-token`,
    onAuthorize: ({ token }) => {
        if (!token) {
            // The first onAuthorize() call has no token for some reason
            isFirstTokenCall = true;
        }
    },
});

export async function getApiToken() {
    if (isFirstTokenCall) {
        // The initial call of getAccessToken() after logging in always seems to fail
        // Ask user to open the command again to fix this
        await popToRoot();

        // isFirstTokenCall will be reset by command exit

        // Don't continue API calls to avoid error message
        return await new Promise(() => {});
    }

    try {
        return getAccessToken().token;
    } catch (err) {
        console.warn("getAccessToken() failed", err);
    }
}

export async function logOut() {
    await oauthClient.removeTokens();
}
