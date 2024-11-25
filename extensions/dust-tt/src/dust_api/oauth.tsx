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

import {
  Detail,
  getPreferenceValues,
  OAuth,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { withAccessToken, OAuthService, usePromise } from "@raycast/utils";
import { DustAPI } from "@dust-tt/client";
import { useEffect } from "react";
import { getUser, getWorkspaceId, setUser } from "../utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "Dust",
  providerIcon: "dust.png",
  providerId: "dust",
  description: "Connect your Dust account",
});

let dustApi: DustAPI | null = null;

const preferences = getPreferenceValues<ExtensionPreferences>();

const provider = new OAuthService({
  client,
  clientId: preferences.oauthClientID,
  scope: "offline_access read:user_profile read:conversation create:conversation update:conversation read:agent",
  authorizeUrl: `${preferences.oauthDomain}/authorize`,
  tokenUrl: `${preferences.oauthDomain}/oauth/token`,
  personalAccessToken: preferences.connexionFlow === "apiKey" ? getPreferenceValues().apiKey : undefined,
  onAuthorize(params) {
    dustApi = new DustAPI(
      {
        nodeEnv: "",
        url: preferences.apiUrl,
      },
      {
        apiKey: params.token,
        workspaceId: "",
      },
      console,
    );
  },
  extraParameters: {
    prompt: "consent",
    audience: preferences.oauthAudience,
  },
});

export const withPickedWorkspace = <T,>(Component: React.ComponentType<T>) => {
  const fn = (Component: React.ComponentType<T>) => {
    if (preferences.connexionFlow === "oauth") {
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
    } else {
      const LegacyCheckComponent: React.ComponentType<T> = (props) => {
        const dustAPI = getDustClient();

        useEffect(() => {
          if (!preferences.apiKey || !preferences.workspaceId || !preferences.userEmail) {
            const timeoutId = setTimeout(() => {
              void openExtensionPreferences();
              void closeMainWindow({
                clearRootSearch: true,
                popToRootType: PopToRootType.Immediate,
              });
            }, 3000);

            return () => {
              clearTimeout(timeoutId);
            };
          }
        }, [preferences.apiKey, preferences.workspaceId, preferences.userEmail]);

        if (!preferences.apiKey || !preferences.workspaceId || !preferences.userEmail) {
          return (
            <Detail
              isLoading
              navigationTitle="Missing API Key"
              markdown={
                "As you have chosen to connect to Dust using a workspace API Key, please provide the apiKey, userEmail and the workspaceId in the extension preferences or change the connect method..."
              }
            />
          );
        } else {
          dustAPI.setWorkspaceId(preferences.workspaceId);

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore too complicated for TS
          return <Component {...props} />;
        }
      };
      return withDustClient(LegacyCheckComponent);
    }
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
