import { getPreferenceValues } from "@raycast/api";

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
}

/**
 * sourcegraphCloud returns the user's configuration for connecting to Sourcegraph Cloud.
 */
export function sourcegraphCloud(): Sourcegraph {
  const prefs: Preferences = getPreferenceValues();
  return {
    instance: cloudURL,
    token: prefs.cloudToken,
    defaultContext: prefs.cloudDefaultContext,
  };
}

/**
 * sourcegraphSelfHosted returns the configured self-hosted Sourcegraph instance.
 */
export function sourcegraphSelfHosted(): Sourcegraph | null {
  const prefs: Preferences = getPreferenceValues();
  if (prefs.customInstance) {
    return {
      instance: prefs.customInstance.replace(/\/$/, ""),
      token: prefs.customInstanceToken,
      defaultContext: prefs.customInstanceDefaultContext,
    };
  }
  return null;
}
