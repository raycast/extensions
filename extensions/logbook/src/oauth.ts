import { getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

interface Preferences {
	webUrl: string;
	apiUrl: string;
}

export function getUrls() {
	const preferences = getPreferenceValues<Preferences>();
	return {
		web: preferences.webUrl.replace(/\/+$/, ""),
		api: preferences.apiUrl.replace(/\/+$/, ""),
	};
}

const client = new OAuth.PKCEClient({
	redirectMethod: OAuth.RedirectMethod.Web,
	providerName: "Logbook",
	providerId: "logbook",
	providerIcon: "extension-icon.png",
	description: "Connect your Logbook account to add and complete tasks.",
});

const urls = getUrls();

/** No refresh URL — the token stays valid until revoked server-side. */
export const logbook = new OAuthService({
	client,
	// Mirrors RAYCAST_CLIENT_ID; can't be imported from outside the workspace.
	clientId: "logbook-raycast",
	scope: "",
	authorizeUrl: `${urls.web}/raycast/authorize`,
	tokenUrl: `${urls.api}/api/raycast/token`,
});
