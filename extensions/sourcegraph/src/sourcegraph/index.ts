import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { v4 as uuidv4 } from "uuid";
import { newApolloClient } from "./gql/apollo";

export interface Sourcegraph {
  /**
   * URL to the Sourcegraph instance. This URL never contains a trailing slash.
   */
  instance: string;
  /**
   * Token for connecting to this Sourcegraph instance.
   */
  token?: string;
  /**
   * Default search context when searching on this Sourcegraph instance.
   */
  defaultContext?: string;
  /**
   * Client for executing GraphQL requests with.
   */
  client: ApolloClient<NormalizedCacheObject>;

  /**
   * Address of the proxy server to use for requests to the custom Sourcegraph instance.
   */
  proxy?: string;

  /**
   * Feature flags for the extension.
   */
  featureFlags: ExtensionFeatureFlags;

  /**
   * Whether a custom Sourcegraph connection has been configured by the user.
   */
  hasCustomSourcegraphConnection: boolean;
}

const dotComURL = "https://sourcegraph.com";

/**
 * isSourcegraphDotCom returns true if this instance URL points to Sourcegraph.com.
 */
export function isSourcegraphDotCom(instance: string) {
  return instance === dotComURL;
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
 * sourcegraphDotCom returns the user's configuration for connecting to Sourcegraph.com.
 */
export async function sourcegraphDotCom(): Promise<Sourcegraph> {
  const prefs = getPreferenceValues<Preferences>();
  const searchPrefs = getPreferenceValues<Preferences.SearchDotCom>();

  // If there is no token, generate a persisted anonymous identifier for the user.
  let anonymousUserID = "";
  if (!prefs.cloudToken) {
    anonymousUserID = (await LocalStorage.getItem("anonymous-user-id")) as string;
    if (!anonymousUserID) {
      anonymousUserID = uuidv4();
      await LocalStorage.setItem("anonymous-user-id", anonymousUserID);
    }
  }

  const connect = {
    instance: dotComURL,
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
export function sourcegraphInstance(): Sourcegraph | null {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.customInstance) {
    return null;
  }
  const searchPrefs = getPreferenceValues<Preferences.SearchInstance>();
  const connect = {
    instance: prefs.customInstance.replace(/\/$/, ""),
    token: prefs.customInstanceToken,
    proxy: prefs.customInstanceProxy,
  };
  return {
    ...connect,
    defaultContext: searchPrefs.customInstanceDefaultContext,
    client: newApolloClient(connect),
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

interface ExtensionFeatureFlags {
  searchPatternDropdown: boolean;
  disableTelemetry: boolean;
}

function newFeatureFlags(prefs: Preferences): ExtensionFeatureFlags {
  return {
    searchPatternDropdown: prefs.featureSearchPatternDropdown !== false, // default true
    disableTelemetry: !!prefs.featureDisableTelemetry,
  };
}
