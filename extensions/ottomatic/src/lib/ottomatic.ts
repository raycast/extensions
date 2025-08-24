import { OAuth, Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetch } from "cross-fetch";
import { decodeJwt } from "jose";
import { z } from "zod";
import { apiBaseUrl, authBaseUrl, clientId } from "./constants";

export const cache = new Cache({ namespace: "ottomatic" });

// const ottomaticClient = hc<AppType>({ baseUrl: apiBaseUrl });

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Ottomatic",
  description: "Sign in with Ottomatic",
});

async function getAccessToken(): Promise<{ accessToken: string }> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      console.log("oauth expired, refreshing tokens");
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }

    return { accessToken: tokenSet.accessToken };
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${authBaseUrl}/oauth/authorize`,
    clientId,
    extraParameters: { response_type: "code" },
    scope: "email private_metadata profile public_metadata",
  });
  console.log("got auth request", authRequest);

  console.log("authorizing client...");
  const { authorizationCode } = await client.authorize(authRequest);
  console.log("got authorization code", authorizationCode);

  console.log("fetching tokens...");
  const tokenResp = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokenResp);
  return { accessToken: tokenResp.access_token };
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("response_type", "code");
  params.append("redirect_uri", authRequest.redirectURI);

  const data = await fetch(`${authBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  })
    .then((res) => {
      if (!res.ok) {
        console.error("fetch tokens error", res.statusText);
        throw new Error(res.statusText);
      }
      return res.json();
    })
    .catch((e) => {
      console.error("fetch tokens error", e);
      throw e;
    });
  return data as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const data = await fetch(`${authBaseUrl}/oauth/token`, {
    method: "POST",
    body: params,
  })
    .then((res) => {
      if (!res.ok) {
        console.error("refresh tokens error", res.statusText);
        throw new Error(res.statusText);
      }
      return res.json();
    })
    .catch((e) => {
      console.error("refresh tokens error", e);
      throw e;
    });
  const tokenResponse = data as OAuth.TokenResponse;

  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

let fetchingJWT = false;
async function getJWT(): Promise<string> {
  const jwt = cache.get("jwt");
  if (jwt) {
    // if not expired, return it
    const { exp } = decodeJwt(jwt);
    if (!!exp && exp * 1000 > Date.now()) {
      console.log("jwt is not expired, returning cached");
      return jwt;
    }
  }

  if (fetchingJWT) {
    console.log("jwt is already being fetched, waiting for it");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getJWT();
  }

  fetchingJWT = true;
  try {
    console.log("jwt is expired or not found, fetching new one");
    const { accessToken } = await getAccessToken();
    console.log("got access token", accessToken);
    const data = await fetch(`${apiBaseUrl}/login`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          console.error("fetch jwt error:", res.statusText);
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .catch((e) => {
        console.error("fetch jwt error:", e);
        throw e;
      });

    cache.set("jwt", data.token);

    return data.token;
  } finally {
    fetchingJWT = false;
  }
}

export function useJWT() {
  const { data: jwt, ...rest } = useCachedPromise(getJWT, [], {
    initialData: cache.get("jwt"),
    keepPreviousData: true,
  });

  if (!jwt) {
    return { data: undefined, rawJWT: null, ...rest };
  }
  const deocded = decodeJwt(jwt);

  const data = z
    .object({
      memberships: z.array(
        z.object({
          id: z.string(),
          organization: z
            .object({
              id: z.string(),
              name: z.string(),
              slug: z.string(),
              imageUrl: z.string(),
              hasImage: z.boolean(),
              publicMetadata: z.object({ org_id: z.number() }),
            })
            .passthrough(),
          role: z.string(),
        }),
      ),
    })
    .or(z.undefined())
    .catch(undefined)
    .parse(deocded);

  return { data, rawJWT: jwt, ...rest };
}
