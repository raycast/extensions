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
   * Default search context when searching on this Sourcegraph instance.
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
 * isSourcegraphDotCom returns true if this instance URL points to Sourcegraph.com.
 */
export function isSourcegraphDotCom(instance: string) {
  return instance === cloudURL;
}

/**
 * instanceName generates a name for the given instance.
 */
export function instanceName(src: Sourcegraph) {
  return `${isSourcegraphDotCom(src.instance) ? "Sourcegraph.com" : new URL(src.instance).hostname}`;
}

interface Preferences {
  // Preferences for Sourcegraph.com - it's still called Cloud to avoid breaking existing
  // configuration.

  cloudToken?: string;
  cloudDefaultContext?: string;

  // Configuration for custom instance commands.

  customInstance?: string;
  customInstanceToken?: string;
  customInstanceDefaultContext?: string;

  // Feature flags

  featureSearchPatternDropdown?: boolean;
}

/**
 * sourcegraphDotCom returns the user's configuration for connecting to Sourcegraph.com.
 */
export function sourcegraphDotCom(): Sourcegraph {
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
 * sourcegraphSelfHosted returns the configured Sourcegraph instance.
 */
export function sourcegraphInstance(): Sourcegraph | null {
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
