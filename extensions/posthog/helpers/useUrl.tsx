import { AuthenticatedPostHogAccount } from "./posthog-auth";

export function useUrl(path: string, account: AuthenticatedPostHogAccount | null) {
  return account ? `${account.baseUrl}/${path}` : "";
}
