import { LocalStorage, OAuth, popToRoot, showToast, Toast } from "@raycast/api";
import { createPlanetScaleClient } from "../api";

const clientId = "pscale_app_f0abb01c616a75cbaf2655be98e08e0a";
const applicationId = "or9t9ym9hocx";

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
    endpoint: "https://app.planetscale.com/oauth/authorize",
    clientId,
    scope:
      "read_user read_organizations read_organization read_databases read_members read_branches write_branches delete_branches write_deploy_requests read_deploy_requests deploy_deploy_requests approve_deploy_requests write_comments read_comments",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
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

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const serviceTokenId = "";
  const serviceToken = "";
  const clientSecret = "";

  const pscale = createPlanetScaleClient(`${serviceTokenId}:${serviceToken}`);

  const tokens = await oauthClient.getTokens();

  const response = (await pscale.createOrRenewAnOauthToken(
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: authRequest.redirectURI,
      refresh_token: tokens?.refreshToken,
    },
    {
      organization: "raycast",
      id: applicationId,
    },
  )) as unknown as CreateOrRenewAnOauthTokenResponse;

  await storeServiceTokenAccesses(response.data.service_token_accesses);

  return {
    id_token: response.data.id,
    access_token: response.data.token!,
    refresh_token: response.data.plain_text_refresh_token,
  };
}

interface CreateOrRenewAnOauthTokenResponse {
  data: {
    id: string;
    token: string;
    plain_text_refresh_token: string;
    service_token_accesses: ServiceTokenAccessesItem[];
  };
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
