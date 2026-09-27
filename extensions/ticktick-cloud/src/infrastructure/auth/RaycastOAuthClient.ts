import { createRequire } from "node:module";
import type { OAuth } from "@raycast/api";

import type { AuthTarget } from "./AuthProvider";
import type {
  AuthorizationRequest,
  OAuthClientPort,
  StoredOAuthTokens,
  ValidatedTokenResponse,
} from "./OAuthClientPort";

type RaycastClient = {
  authorizationRequest(options: OAuth.AuthorizationRequestOptions): Promise<AuthorizationRequest>;
  authorize(request: AuthorizationRequest): Promise<{ authorizationCode: string }>;
  getTokens(): Promise<OAuth.TokenSet | undefined>;
  setTokens(options: OAuth.TokenSetOptions): Promise<void>;
  removeTokens(): Promise<void>;
};
export interface RaycastOAuthDependencies {
  create(options: OAuth.PKCEClient.Options): RaycastClient;
  redirectMethodWeb: OAuth.RedirectMethod;
}

function defaultDependencies(): RaycastOAuthDependencies {
  const { OAuth } = createRequire(__filename)("@raycast/api") as typeof import("@raycast/api");
  return {
    create: (options) => {
      const client = new OAuth.PKCEClient(options);
      return {
        authorizationRequest: (request) => client.authorizationRequest(request),
        authorize: (request) => client.authorize(request as OAuth.AuthorizationRequest),
        getTokens: () => client.getTokens(),
        setTokens: (tokens) => client.setTokens(tokens),
        removeTokens: () => client.removeTokens(),
      };
    },
    redirectMethodWeb: OAuth.RedirectMethod.Web,
  };
}

export class RaycastOAuthClient implements OAuthClientPort {
  private readonly client: RaycastClient;
  constructor(target: AuthTarget, dependencies: RaycastOAuthDependencies = defaultDependencies()) {
    this.client = dependencies.create({
      redirectMethod: dependencies.redirectMethodWeb,
      providerName: "TickTick",
      providerIcon: "tick-logo.png",
      providerId: `ticktick-${target}`,
    });
  }
  authorizationRequest(options: {
    endpoint: string;
    clientId: string;
    scope: string;
    extraParameters: Record<string, string>;
  }): Promise<AuthorizationRequest> {
    return this.client.authorizationRequest(options);
  }
  authorize(request: AuthorizationRequest): Promise<{ authorizationCode: string }> {
    return this.client.authorize(request);
  }
  async getTokens(): Promise<StoredOAuthTokens | undefined> {
    const tokens = await this.client.getTokens();
    return (
      tokens && {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        scope: tokens.scope,
        updatedAt: tokens.updatedAt,
        isExpired: tokens.isExpired(),
      }
    );
  }
  setTokens(response: ValidatedTokenResponse, previousRefreshToken?: string): Promise<void> {
    return this.client.setTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? previousRefreshToken,
      expiresIn: response.expires_in,
      scope: response.scope,
    });
  }
  removeTokens(): Promise<void> {
    return this.client.removeTokens();
  }
}
