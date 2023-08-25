import { showToast, Toast, LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useState } from "react";
import useSWR from "swr";

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

export const getUserLikes = async () => {
  let username = await LocalStorage.getItem("username");

  if (!username) {
    const user = await apiRequest<User>("/me");
    LocalStorage.setItem("username", user.username);
    username = user.username;
  }

  const likes = await apiRequest<LikesResult[]>(`/users/${username}/likes`);
  return likes;
};

export default useLikes;
