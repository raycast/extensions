import { LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useCachedPromise } from "@raycast/utils";
import {LikesResult, User } from "@/types";

export const useLikes = () => {
  const { isLoading: loading, data: likes } = useCachedPromise(getUserLikes,
    [],
    {
      failureToastOptions: {
        title: "Failed to fetch likes.",
      },
    },
  );

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
