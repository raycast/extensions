import { showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { HolopinApiResponse } from "../types";

export function useHolopinAPI(username: string) {
  const { isLoading, data, revalidate } = useFetch<HolopinApiResponse>(
    `https://holopin.io/api/stickers?username=${username}`,
    {
      keepPreviousData: true,
    }
  );

  const { pop } = useNavigation();

  useEffect(() => {
    if (!data?.data.count) {
      showToast({
        style: Toast.Style.Failure,
        title: "No stickers found",
        message: "You either don't have any stickers or the username is incorrect.",
      });
      pop();
    }
  }, [data]);

  return { isLoading, data, revalidate };
}
