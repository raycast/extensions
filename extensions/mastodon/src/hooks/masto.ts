import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
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
