import http from "http";
import { OAuth } from "@raycast/api";
import { createDatabaseToken, type Database } from "./api";
import { LocalStorage } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Turso",
  providerIcon: "icon.png",
  description: "Connect your Turso account…",
});

export async function authorize() {
  const tokens = await client.getTokens();
  if (tokens) {
    if (tokens.isExpired()) {
      await client.removeTokens();
    } else {
      return tokens;
    }
  }

  let authRequest: OAuth.AuthorizationRequest | null = null;

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const jwt = url.searchParams.get("jwt");
    const state = url.searchParams.get("state");

    if (!jwt) {
      return res.writeHead(400).end();
    }

    if (state !== authRequest?.state) {
      return res.writeHead(400).end();
    }

    await client.setTokens({ accessToken: jwt, expiresIn: 7 * 24 * 60 * 60 });

    const redirectURL = new URL(authRequest.redirectURI);
    redirectURL.searchParams.set("code", authRequest.codeVerifier);
    redirectURL.searchParams.set("state", authRequest.state);
    console.log(redirectURL.href);

    res.writeHead(301, {
      Location: redirectURL.href,
    });
    res.end();
  });

  server.listen(0);

  const { port } = server.address() as { address: string; family: string; port: number };

  authRequest = await client.authorizationRequest({
    endpoint: "https://api.turso.tech",
    clientId: "",
    scope: "",
    extraParameters: {
      type: "cli",
      redirect: "true",
      port: port.toString(),
    },
  });
  await client.authorize({
    url: `https://api.turso.tech/?type=cli&redirect=true&port=${port}&state=${authRequest.state}`,
  });
  // await client.authorize(authRequest);
  server.close();
  return client.getTokens() as unknown as OAuth.TokenSet;
}

export async function logout() {
  return client.removeTokens();
}

export async function getDatabaseToken(database: Database) {
  const value = await LocalStorage.getItem<string>("database_token");
  const tokens = value ? (JSON.parse(value) as Record<string, { token: string; expiration: number }>) : {};

  if (
    !tokens[database.DbId]?.token ||
    (tokens[database.DbId].expiration !== -1 && tokens[database.DbId].expiration < Date.now())
  ) {
    const jwt = await createDatabaseToken(database.organization, database.Name);
    tokens[database.DbId] = { token: jwt, expiration: -1 };
    await LocalStorage.setItem("database_token", JSON.stringify(tokens));
  }
  return tokens[database.DbId].token;
}
