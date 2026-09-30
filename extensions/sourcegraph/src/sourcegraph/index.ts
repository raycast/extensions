import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { newApolloClient } from "./gql/apollo";
import { checkHasBuiltinOAuth as checkHasBuiltinOAuthClient } from "./version";
import type { Sourcegraph, ExtensionFeatureFlags } from "./types";

export type { Sourcegraph, ExtensionFeatureFlags };

const DOTCOM_URL = "https://sourcegraph.com";

/**
 * BUILTIN_CLIENT_ID is the Raycast client baked into Sourcegraph since the
 * version specified in checkHasBuiltinOAuth
 */
const BUILTIN_CLIENT_ID = "sgo_cid_sourcegraphraycast";

/**
 * isSourcegraphDotCom returns true if this instance URL points to Sourcegraph.com.
 */
export function isSourcegraphDotCom(instance: string) {
  return instance === DOTCOM_URL;
}

/**
 * instanceName generates a name for the given instance.
 */
export function instanceName(src: Sourcegraph) {
  if (isSourcegraphDotCom(src.instance)) {
    return "Sourcegraph.com";
  }
  return new URL(src.instance).hostname || src.instance || null;
}

/**
 * hasOAuth returns true if the Sourcegraph instance has an OAuth service configured.
 */
export function usesOAuth(src: Sourcegraph): src is Sourcegraph & { oauth: OAuthService } {
  return !!src.oauth;
}

export async function getAnonymousUserID(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>("anonymous-user-id");
}

/**
 * sourcegraphDotCom returns the user's configuration for connecting to Sourcegraph.com.
 */
export async function sourcegraphDotCom(): Promise<Sourcegraph> {
  const prefs = getPreferenceValues<Preferences>();
  const searchPrefs = getPreferenceValues<Preferences.SearchDotCom>();

  // If there is no token, generate a persisted anonymous identifier for the user.
  let anonymousUserID = "";
  if (!prefs.cloudToken) {
    anonymousUserID = (await getAnonymousUserID()) || "";
    if (!anonymousUserID) {
      anonymousUserID = uuidv4();
      await LocalStorage.setItem("anonymous-user-id", anonymousUserID);
    }
  }

  const connect = {
    instance: DOTCOM_URL,
    token: prefs.cloudToken,
    anonymousUserID,
  };
  return {
    ...connect,
    defaultContext: searchPrefs.cloudDefaultContext,
    client: newApolloClient(connect),
    featureFlags: newFeatureFlags(prefs),
    hasCustomSourcegraphConnection: !!(prefs.customInstance && prefs.customInstanceToken),
  };
}

/**
 * sourcegraphInstance returns the configured Sourcegraph instance.
 */
export async function sourcegraphInstance(): Promise<Sourcegraph | null> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.customInstance) {
    return null;
  }
  const searchPrefs = getPreferenceValues<Preferences.SearchInstance>();
  const instance = prefs.customInstance.replace(/\/$/, "");

  let token = prefs.customInstanceToken;
  let oauth: OAuthService | undefined;
  if (!token) {
    // Conditionally enable OAuth based on version
    const supportsBuiltInClient = await checkHasBuiltinOAuthClient(instance, prefs);
    if (supportsBuiltInClient) {
      const instanceName = new URL(instance).host;
      const client = new OAuth.PKCEClient({
        redirectMethod: OAuth.RedirectMethod.App,
        providerName: "Sourcegraph",
        providerIcon: "command-icon.png",
        providerId: "sourcegraph",
        description: `Connect your '${instanceName}' account.`,
      });
      oauth = new OAuthService({
        client,
        clientId: BUILTIN_CLIENT_ID,
        scope: ["user:all", "offline_access"],
        authorizeUrl: `${instance}/.auth/idp/oauth/authorize`,
        tokenUrl: `${instance}/.auth/idp/oauth/token`,
        refreshTokenUrl: `${instance}/.auth/idp/oauth/token`,
        bodyEncoding: "url-encoded",
      });

      // Determine if we can use our current token, or if we need to refresh our
      // token
      const storedTokenSet = await client.getTokens();
      const REFRESH_BUFFER_SECONDS = 60;
      const needsRefresh =
        storedTokenSet?.isExpired() ||
        (storedTokenSet?.expiresIn !== undefined && storedTokenSet.expiresIn <= REFRESH_BUFFER_SECONDS);
      if (needsRefresh) {
        token = await oauth.authorize();
      } else if (storedTokenSet) {
        token = storedTokenSet.accessToken;
      }
    }
  }

  const anonymousUserID = await getAnonymousUserID();

  const src = {
    instance,
    token,
    proxy: prefs.customInstanceProxy,
    oauth,
    anonymousUserID,
  };
  return {
    ...src,
    defaultContext: searchPrefs.customInstanceDefaultContext,
    client: newApolloClient(src),
    featureFlags: newFeatureFlags(prefs),
    hasCustomSourcegraphConnection: true,
  };
}

export class LinkBuilder {
  private command: string;

  constructor(command: string) {
    this.command = command;
  }

  /**
   * new sets up a URL to the given path for this Sourcegraph instance and command context,
   * and adds some UTM parameters.
   */
  new(src: Sourcegraph, path: string, params?: URLSearchParams): string {
    const parsed = new URL(`${src.instance}${path.startsWith("/") ? path : `/${path}`}`);
    parsed.searchParams.set("utm_source", "raycast-sourcegraph");
    parsed.searchParams.set("utm_campaign", this.command);
    params?.forEach((v, k) => {
      parsed.searchParams.set(k, v);
    });
    return parsed.toString();
  }
}

function newFeatureFlags(prefs: Preferences): ExtensionFeatureFlags {
  return {
    searchPatternDropdown: prefs.featureSearchPatternDropdown !== false, // default true
    disableTelemetry: !!prefs.featureDisableTelemetry,
  };
}
