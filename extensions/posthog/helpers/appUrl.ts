import { AuthenticatedPostHogAccount } from "./posthog-auth";

export function buildAppUrl(path: string, account: AuthenticatedPostHogAccount | null) {
  return account ? `${account.baseUrl}/${path}` : "";
}
