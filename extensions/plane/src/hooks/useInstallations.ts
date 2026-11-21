import { useCachedPromise } from "@raycast/utils";
import { getAppInstallations } from "../api/installations";

export function useInstallations(accessToken: string | undefined) {
  return useCachedPromise((accessToken: string) => getAppInstallations({ accessToken }), [accessToken ?? ""], {
    execute: !!accessToken,
  });
}
