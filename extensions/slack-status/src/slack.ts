import { OAuth, getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import fetch from "node-fetch";
import { OAuthSessionConfig, useOAuthSession } from "./oauth";

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
  const accessToken = useOAuthSession();
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

export async function isSlackInstalled() {
  const applications = await getApplications();
  return applications.find((app) => app.bundleId === "com.tinyspeck.slackmacgap") !== undefined;
}

export class SlackOAuthSessionConfig implements OAuthSessionConfig {
  private baseUrl: string;
  private clientId: string;
  private userScopes: string[];

  private client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Slack",
    providerIcon: "slack.svg",
    providerId: "slack",
    description: "Connect your Slack account to post weekly updates",
  });

  constructor(options: { baseUrl?: string; clientId: string; userScopes: string[] }) {
    this.baseUrl = options.baseUrl ?? "https://slack.oauth.raycast.com";
    this.clientId = options.clientId;
    this.userScopes = options?.userScopes ?? [];
  }

  async authorize() {
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
    const params = new URLSearchParams();
    params.append("client_id", this.clientId);
    params.append("code", authCode);
    params.append("code_verifier", authRequest.codeVerifier);
    params.append("grant_type", "authorization_code");
    params.append("client_secret", "7845b90631f6b0daae10f8a331b5c3ce"); // TODO(RAY-10396): Remove after proxy is fixed
    params.append("redirect_uri", "https://slack.oauth.raycast.com/redirect"); // TODO(RAY-10396): Remove after proxy is fixed

    // TODO(RAY-10396): Switch to `${this.baseUrl}/token` after proxy is fixed
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
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
      refresh_token: "",
    };
  }
}
