import { getPreferenceValues } from "@raycast/api";

export interface Sourcegraph {
  instance: string;
  token?: string;
  defaultContext?: string;
}

const cloudURL = "https://sourcegraph.com";

export function isCloud(instance: string) {
  return instance === cloudURL;
}

export function instanceName(src: Sourcegraph) {
  return `${isCloud(src.instance) ? "Sourcegraph Cloud" : new URL(src.instance).hostname}`;
}

interface Preferences {
  cloudToken?: string;
  cloudDefaultContext?: string;

  customInstance?: string;
  customInstanceToken?: string;
  customInstanceDefaultContext?: string;
}

export function sourcegraphCloud(): Sourcegraph {
  const prefs: Preferences = getPreferenceValues();
  return {
    instance: cloudURL,
    token: prefs.cloudToken,
    defaultContext: prefs.cloudDefaultContext,
  };
}

export function sourcegraphSelfHosted(): Sourcegraph | null {
  const prefs: Preferences = getPreferenceValues();
  if (prefs.customInstance) {
    return {
      instance: prefs.customInstance,
      token: prefs.customInstanceToken,
      defaultContext: prefs.customInstanceDefaultContext,
    };
  }
  return null;
}
