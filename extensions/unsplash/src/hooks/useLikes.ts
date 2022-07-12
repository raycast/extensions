import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import useSWR from "swr";

export const useLikes = () => {
  const { accessKey, username } = getPreferenceValues();

  if (!username) {
    showToast(Toast.Style.Failure, "Username is missing.", "Please set a username from extension settings.");
  }

  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikesResult[]>([]);

  const fetcher = (url: string) =>
    fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }).then((r) => r.json() as Promise<LikesResult[]>);

  useSWR<LikesResult[]>(`https://api.unsplash.com/users/${username}/likes`, fetcher, {
    onSuccess: (data) => {
      if ((data as Errors).errors) {
        setLoading(false);
        showToast(Toast.Style.Failure, "Failed to fetch likes.", (data as Errors).errors?.join("\n"));
      } else {
        setLikes(data);
      }

      setLoading(false);
    },
    onError: (error) => {
      showToast(Toast.Style.Failure, "Something went wrong.", String(error));
      setLoading(false);
    },
  });

  return {
    loading,
    likes,
  };
};

export default useLikes;
