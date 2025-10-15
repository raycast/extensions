import { useRef } from "react";

import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { Result } from "@/types";

export const useData = (domain: string | null) => {
  const toast = useRef<Toast | null>(null);
  const { data, error, isLoading, revalidate } = useFetch<Result>(
    `https://observatory-api.mdn.mozilla.net/api/v2/analyze?host=${domain}`,
    {
      execute: !!domain,
      onWillExecute: async () => {
        toast.current = await showToast({ style: Toast.Style.Animated, title: "Scanning your domain" });
      },
    },
  );

  if (data && toast.current) {
    toast.current.style = Toast.Style.Success;
    toast.current.title = "Scan complete";
    toast.current.message = "Your domain has been scanned";
  }

  if (error && toast.current) {
    toast.current.style = Toast.Style.Failure;
    toast.current.title = "Something went wrong";
    toast.current.message = "Please try again later";
  }

  return { data, error, isLoading, revalidate };
};
