import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import useSWR from "swr";
import { getUserLikes } from "@/functions/getUserLikes";

export const useLikes = () => {
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikesResult[]>([]);

  useSWR<LikesResult[]>(`get-user-likes`, getUserLikes, {
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
