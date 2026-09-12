import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { Result } from "@/types";

export const useData = (domain: string | null) => {
  const { data, error, isLoading, revalidate } = useFetch<Result>(
    `https://observatory-api.mdn.mozilla.net/api/v2/analyze?host=${domain}`,
    {
      execute: !!domain,
      onWillExecute: async () => {
        await showToast({ style: Toast.Style.Animated, title: "Scanning your domain" });
      },
      onData: async () => {
        await showToast({
          style: Toast.Style.Success,
          title: "Scan complete",
          message: "Your domain has been scanned",
        });
      },
    },
  );

  return { data, error, isLoading, revalidate };
};
