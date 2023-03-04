import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { login, mastodon } from "masto";

interface Preferences {
  url: string;
  accessToken: string;
}

const { url, accessToken } = getPreferenceValues<Preferences>();

const masto = login({
  url,
  accessToken,
  disableVersionCheck: true,
});

export function useMasto(): mastodon.Client | undefined {
  return usePromise(() => masto).data;
}

export function useInstance(masto: mastodon.Client | undefined) {
  return useCachedPromise(async (masto: mastodon.Client | undefined) => masto?.v2.instance.fetch(), [masto]);
}

export function useMe(masto: mastodon.Client | undefined) {
  return useCachedPromise(async (masto: mastodon.Client | undefined) => masto?.v1.accounts.verifyCredentials(), [masto]);
}
