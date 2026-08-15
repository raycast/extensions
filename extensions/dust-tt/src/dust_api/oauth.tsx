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

import { DustAPI } from "@dust-tt/client";
import { Detail, launchCommand, LaunchType, LocalStorage, OAuth } from "@raycast/api";
import { OAuthService, usePromise, withAccessToken } from "@raycast/utils";
import { jwtDecode } from "jwt-decode";
import { extractAndStoreRegion, getUser, getWorkspaceId, setUser } from "../utils";
import env from "./env";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dust",
  providerIcon: "dust.png",
  providerId: "dust",
  description: "Connect your Dust account",
});

let dustApi: DustAPI | null = null;
let currentToken: string | null = null;

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
    // Store the token for multi-region access
    currentToken = params.token;

    // Check if this is a fresh log in
    try {
      const decoded = jwtDecode<{ sub?: string }>(params.token);
      const currentUserId = decoded.sub;
      const storedUserId = await LocalStorage.getItem<string>("currentUserId");

      if (currentUserId && currentUserId !== storedUserId) {
        // Fresh login - clear everything
        await LocalStorage.removeItem("workspaceId");
        await LocalStorage.removeItem("selectedRegion");
        await LocalStorage.removeItem("user");
        await LocalStorage.setItem("currentUserId", currentUserId);

        // Extract region from JWT for the new user
        await extractAndStoreRegion(params.token);
      }
    } catch (error) {
      // On error, extract region but don't clear workspace
      await extractAndStoreRegion(params.token);
    }

    // Now getDustDomain() will return the correct regional URL
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
      const { data: userData, isLoading: isLoadingUser } = usePromise(async () => {
        const dustAPI = getDustClient();
        const cachedUser = await getUser();
        if (cachedUser) {
          return { user: cachedUser, dustAPI };
        }

        const r = await dustAPI.me();
        if (r.isErr()) {
          // Handle authentication errors by clearing stale data
          if (r.error.type === "user_not_found") {
            await LocalStorage.removeItem("workspaceId");
            await LocalStorage.removeItem("selectedRegion");
            await LocalStorage.removeItem("user");
          }
          return { user: undefined, dustAPI };
        } else {
          await setUser(r.value);
          return { user: r.value, dustAPI };
        }
      }, []);

      const { data: workspaceId, isLoading: isLoadingWorkspace } = usePromise(async () => {
        return await getWorkspaceId();
      }, []);

      if (isLoadingUser || isLoadingWorkspace) {
        return <Detail isLoading />;
      } else if (userData?.user && workspaceId) {
        userData.dustAPI.setWorkspaceId(workspaceId);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore too complicated for TS
        return <Component {...props} />;
      } else {
        try {
          launchCommand({
            name: "pickWorkspace",
            type: LaunchType.UserInitiated,
            context: {
              missingWorkspace: true,
            },
          });
        } catch (error) {
          console.error("Error launching pickWorkspace command:", error);
        }
      }
    };
    return withDustClient(OauthCheckComponent);
  };

  return fn(Component);
};

export const withDustClient = <T,>(Component: React.ComponentType<T>) => {
  return withAccessToken(provider)(Component);
};

// Helper to recreate the API client with a new region
export async function recreateDustClientForRegion(region: string) {
  if (!currentToken) {
    throw new Error("No token available");
  }

  const apiUrl = region === "europe-west1" ? env.DUST_EU_URL : env.DUST_US_URL;
  const workspaceId = dustApi?.workspaceId() || "";

  dustApi = new DustAPI(
    {
      url: apiUrl,
    },
    {
      apiKey: currentToken,
      workspaceId: workspaceId,
    },
    console,
  );
}

export function getDustClient(): DustAPI {
  if (!dustApi) {
    throw new Error("No dust client initialized");
  }
  return dustApi;
}

export function getCurrentToken(): string {
  if (!currentToken) {
    throw new Error("No token available");
  }
  return currentToken;
}
