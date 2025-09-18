// Polyfill for fetch so that Dust client can rely on the Stream API that the raycast cross-fetch doesn't support
import { fetch, Headers, Request, Response } from "undici";

// @ts-expect-error there are some diff in the unidi types but it works
global.fetch = fetch;
// @ts-expect-error there are some diff in the unidi types but it works
global.Headers = Headers;
// @ts-expect-error there are some diff in the unidi types but it works
global.Request = Request;
// @ts-expect-error there are some diff in the unidi types but it works
global.Response = Response;

import { Detail, OAuth, launchCommand, LaunchType } from "@raycast/api";
import { withAccessToken, OAuthService, usePromise } from "@raycast/utils";
import { DustAPI } from "@dust-tt/client";
import { getUser, getWorkspaceId, setUser } from "../utils";
import env from "./env";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dust",
  providerIcon: "dust.png",
  providerId: "dust",
  description: "Connect your Dust account",
});

let dustApi: DustAPI | null = null;

const DEFAULT_WORKOS_TOKEN_EXPIRY = 60 * 5; // 5 minutes

type WorkOSTokenResponse = {
  access_token: string;
  refresh_token: string;
};

function parseTokenResponse(response: unknown) {
  if (
    typeof response === "object" &&
    response !== null &&
    "access_token" in response &&
    "refresh_token" in response &&
    typeof response.access_token === "string" &&
    typeof response.refresh_token === "string"
  ) {
    const tokenResponse: WorkOSTokenResponse = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    };
    return {
      ...tokenResponse,
      expires_in: DEFAULT_WORKOS_TOKEN_EXPIRY,
    };
  }
  throw new Error("Invalid token response format");
}

export const provider = new OAuthService({
  client,
  clientId: env.auth.OAUTH_CLIENT_ID,
  scope: "openid profile email offline_access",
  authorizeUrl: `${env.auth.OAUTH_DOMAIN}/user_management/authorize`,
  tokenUrl: `${env.auth.OAUTH_DOMAIN}/user_management/authenticate`,
  refreshTokenUrl: `${env.auth.OAUTH_DOMAIN}/user_management/authenticate`,
  // Raycast OAuthService does not automaticaly parses WorkOS token expiry
  // we set the expiry manually to the default WorkOS token expiry.
  tokenResponseParser: parseTokenResponse,
  tokenRefreshResponseParser: parseTokenResponse,
  async onAuthorize(params) {
    // Use default US region initially, region will be determined when workspace is selected
    const apiUrl = await env.getDustDomain();

    dustApi = new DustAPI(
      {
        url: apiUrl,
      },
      {
        apiKey: params.token,
        workspaceId: "",
      },
      console,
    );
  },
  extraParameters: {
    provider: "authkit",
  },
});

export const withPickedWorkspace = <T,>(Component: React.ComponentType<T>) => {
  const fn = (Component: React.ComponentType<T>) => {
    const OauthCheckComponent: React.ComponentType<T> = (props) => {
      const dustAPI = getDustClient();

      const { data: user, isLoading: isLoadingUser } = usePromise(async () => {
        const cachedUser = await getUser();
        if (cachedUser) {
          return cachedUser;
        }

        const r = await dustAPI.me();
        if (r.isErr()) {
          return undefined;
        } else {
          await setUser(r.value);
          return r.value;
        }
      }, []);

      const { data: workspaceId, isLoading: isLoadingWorkspace } = usePromise(async () => {
        return await getWorkspaceId();
      }, []);

      if (isLoadingUser || isLoadingWorkspace) {
        return <Detail isLoading />;
      } else if (user && workspaceId) {
        dustAPI.setWorkspaceId(workspaceId);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore too complicated for TS
        return <Component {...props} />;
      } else {
        launchCommand({
          name: "pickWorkspace",
          type: LaunchType.UserInitiated,
          context: {
            missingWorkspace: true,
          },
        });
      }
    };
    return withDustClient(OauthCheckComponent);
  };

  return fn(Component);
};

export const withDustClient = <T,>(Component: React.ComponentType<T>) => {
  return withAccessToken(provider)(Component);
};

export function getDustClient(): DustAPI {
  if (!dustApi) {
    throw new Error("No dust client initialized");
  }

  return dustApi;
}
