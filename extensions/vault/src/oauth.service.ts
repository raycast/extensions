import { URL } from "url";
import http from "http";
import { OAuth } from "@raycast/api";
import { callLoginWthOidc, callOidcAuthUrl } from "./utils";

const localPort = 8250;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Vault",
  providerIcon: "vault.png",
  providerId: "vault",
  description: "Connect to vault with OIDC provider (you can change the login method in preferences)",
});

function rewriteQueryParam(url: string, paramName: string, paramValue: string): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set(paramName, paramValue);
  return urlObj.toString();
}

function getQueryPart(url: string): string {
  return url.substring(url.indexOf("?") + 1);
}

function getQueryParam(url: string, paramName: string): string {
  const paramValue = new URLSearchParams(url).get(paramName);
  if (!paramValue) {
    throw new Error(`Could not find query param named ${paramName}`);
  }
  return paramValue;
}

export async function clearTokens(): Promise<void> {
  await client.removeTokens();
}

export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken && !tokenSet.isExpired()) {
    return tokenSet.accessToken;
  }

  const vaultAuthUrlResponse = await callOidcAuthUrl(`http://localhost:${localPort}/oidc/callback`);
  console.log(vaultAuthUrlResponse);
  const authRequest = await client.authorizationRequest({
    endpoint: `http://localhost:${localPort}/authorize`,
    clientId: "vault",
    scope: "openid",
  });

  let accessToken = "";
  let expiresIn = 3600;
  const server = http.createServer(async function (req, res) {
    if (!req.url) {
      return;
    }

    const queryPart = getQueryPart(req.url);
    const vaultLoginResponse = await callLoginWthOidc(
      getQueryParam(queryPart, "code"),
      getQueryParam(queryPart, "state")
    );

    accessToken = vaultLoginResponse.auth.client_token;
    expiresIn = vaultLoginResponse.auth.lease_duration;
    res.writeHead(301, {
      Location: rewriteQueryParam(`${authRequest.redirectURI}&${queryPart}`, "state", authRequest.state),
    });
    res.end();
  });

  server.listen(localPort);
  await client.authorize({ url: vaultAuthUrlResponse.data.auth_url });
  server.close();

  await client.setTokens({
    accessToken,
    expiresIn,
  });
  return accessToken;
}
