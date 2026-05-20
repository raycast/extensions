import { useCachedPromise } from "@raycast/utils";
import axios from "axios";
import { AuthenticatedPostHogAccount } from "./posthog-auth";

export function usePostHogClient<T>(
  path: string,
  {
    account,
    execute = true,
    onData = (() => null) as (data: T) => void,
  }: { account: AuthenticatedPostHogAccount | null; execute?: boolean; onData?: (data: T) => void }
) {
  return useCachedPromise(fetchPostHogApi<T>, [account?.baseUrl ?? "", account?.accessToken ?? "", path], {
    keepPreviousData: true,
    execute: execute && account !== null,
    onData,
  });
}

export async function fetchPostHogApi<T>(baseUrl: string, accessToken: string, path: string): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const response = await axios.get<T>(`${baseUrl}/api/${normalizedPath}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}
