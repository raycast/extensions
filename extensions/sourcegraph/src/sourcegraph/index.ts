import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { getPreferenceValues } from "@raycast/api";
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
   * Default search context when searching on Sourcegraph Cloud
   */
  defaultContext?: string;
  /**
   * Client for executing GraphQL requests with.
   */
  client: ApolloClient<NormalizedCacheObject>;

  /**
   * Feature flags for the extension.
   */
  featureFlags: ExtensionFeatureFlags;
}

const cloudURL = "https://sourcegraph.com";

/**
 * isSourcegraphCloud returns true if this instance URL points to Sourcegraph Cloud.
 */
export function isSourcegraphCloud(instance: string) {
  return instance === cloudURL;
}

/**
 * instanceName generates a name for the given instance.
 */
export function instanceName(src: Sourcegraph) {
  return `${isSourcegraphCloud(src.instance) ? "Sourcegraph Cloud" : new URL(src.instance).hostname}`;
}

interface Preferences {
  // Preferences for Sourcegraph Cloud

  cloudToken?: string;
  cloudDefaultContext?: string;

  // Fields for self-hosted are internally named "customInstance" for back-compat with
  // older configuration.

  customInstance?: string;
  customInstanceToken?: string;
  customInstanceDefaultContext?: string;

  // Feature flags

  featureSearchPatternDropdown?: boolean;
}

/**
 * sourcegraphCloud returns the user's configuration for connecting to Sourcegraph Cloud.
 */
export function sourcegraphCloud(): Sourcegraph {
  const prefs: Preferences = getPreferenceValues();
  const connect = {
    instance: cloudURL,
    token: prefs.cloudToken,
  };
  return {
    ...connect,
    defaultContext: prefs.cloudDefaultContext,
    client: newApolloClient(connect),
    featureFlags: newFeatureFlags(prefs),
  };
}

/**
 * sourcegraphSelfHosted returns the configured self-hosted Sourcegraph instance.
 */
export function sourcegraphSelfHosted(): Sourcegraph | null {
  const prefs: Preferences = getPreferenceValues();
  if (!prefs.customInstance) {
    return null;
  }
  const connect = {
    instance: prefs.customInstance.replace(/\/$/, ""),
    token: prefs.customInstanceToken,
  };
  return {
    ...connect,
    defaultContext: prefs.customInstanceDefaultContext,
    client: newApolloClient(connect),
    featureFlags: newFeatureFlags(prefs),
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
}

function newFeatureFlags(prefs: Preferences): ExtensionFeatureFlags {
  return {
    searchPatternDropdown: !!prefs.featureSearchPatternDropdown,
  };
}
