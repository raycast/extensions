import { LocalStorage, OAuth, popToRoot, showToast, Toast } from "@raycast/api";

const clientId = "pscale_app_f0abb01c616a75cbaf2655be98e08e0a";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "PlanetScale",
  providerIcon: "extension-icon.png",
  providerId: "planetscale",
  description: "Connect your PlanetScale account",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    return {
      idToken: existingTokens.idToken,
      accessToken: existingTokens.accessToken,
    };
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://planetscale.oauth.raycast.com/authorize",
    clientId,
    scope: "",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
  };
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://planetscale.oauth.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });

  const tokens = (await response.json()) as CreateOrRenewAnOauthTokenResponse;

  await storeServiceTokenAccesses(tokens.service_token_accesses);

  return {
    id_token: tokens.id,
    access_token: tokens.token,
    refresh_token: tokens.plain_text_refresh_token,
  };
}

export async function logout() {
  await oauthClient.removeTokens();
  await LocalStorage.removeItem("service-token-accesses");
  await showToast({
    title: "Authentication failed",
    message: "You need to login again to continue using this extension.",
    style: Toast.Style.Failure,
  });
  await popToRoot();
}

interface CreateOrRenewAnOauthTokenResponse {
  id: string;
  token: string;
  plain_text_refresh_token: string;
  service_token_accesses: ServiceTokenAccessesItem[];
}

interface ServiceTokenAccessesItem {
  id: string;
  type: string;
  access: string;
  description: string;
  resource_name: string;
  resource_id: string;
  resource_type: "Organization" | "User";
}

export async function storeServiceTokenAccesses(tokens: ServiceTokenAccessesItem[]) {
  return LocalStorage.setItem("service-token-accesses", JSON.stringify(tokens));
}

export async function getServiceTokenAccesses() {
  try {
    const value: string | undefined = await LocalStorage.getItem("service-token-accesses");
    if (!value) {
      await logout();
      return [];
    }
    return JSON.parse(value) as ServiceTokenAccessesItem[];
  } catch (e) {
    await logout();
    return [];
  }
}
