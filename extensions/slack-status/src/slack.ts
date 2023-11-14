import { OAuth } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import fetch from "node-fetch";
import { OAuthSessionConfig, getOAuthSession } from "./oauth";

type SlackOAuthResponse = {
  ok: boolean;
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
  };
};

let webClient: WebClient;

export function useSlack() {
  const accessToken = getOAuthSession();
  webClient = webClient ?? new WebClient(accessToken);
  return webClient;
}

export function useSlackProfile() {
  const slack = useSlack();
  return usePromise(async () => {
    const response = await slack.users.profile.get();
    if (!response.ok) {
      throw Error("Failed to fetch profile");
    }
    return response.profile;
  });
}

export class SlackOAuthSessionConfig implements OAuthSessionConfig {
  private baseUrl: string;
  private clientId: string;
  private userScopes: string[];
  private defaultAccessToken?: string;

  private client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Slack",
    providerIcon: "slack.svg",
    providerId: "slack",
    description: "Connect your Slack account to set your status",
  });

  constructor(options: { baseUrl?: string; clientId: string; userScopes: string[]; defaultAccessToken?: string }) {
    this.baseUrl = options.baseUrl ?? "https://slack.oauth.raycast.com";
    this.clientId = options.clientId;
    this.userScopes = options.userScopes ?? [];
    this.defaultAccessToken = options.defaultAccessToken;
  }

  async authorize() {
    if (this.defaultAccessToken) {
      await this.client.removeTokens();
      return this.defaultAccessToken;
    }

    const existingTokens = await this.client.getTokens();

    if (existingTokens?.accessToken) {
      return existingTokens.accessToken;
    }

    const authRequest = await this.client.authorizationRequest({
      endpoint: `${this.baseUrl}/authorize`,
      clientId: this.clientId,
      scope: "",
      extraParameters: {
        user_scope: this.userScopes.join(" "),
      },
    });

    const { authorizationCode } = await this.client.authorize(authRequest);
    const tokens = await this.fetchTokens(authRequest, authorizationCode);
    await this.client.setTokens(tokens);

    return tokens.access_token;
  }

  private async fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string) {
    const response = await fetch(`${this.baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        code: authCode,
        code_verifier: authRequest.codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: authRequest.redirectURI,
      }),
    });

    if (!response.ok) {
      console.error("fetch tokens error:", await response.text());
      throw new Error(response.statusText);
    }

    const parsedResponse = (await response.json()) as SlackOAuthResponse;
    if (!parsedResponse.ok) {
      console.error("fetch tokens error:", parsedResponse);
      throw new Error("Failed to fetch tokens");
    }

    return {
      access_token: parsedResponse.authed_user.access_token,
      scope: parsedResponse.authed_user.scope,
    };
  }
}
