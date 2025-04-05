import { LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useCachedPromise } from "@raycast/utils";
import { Errors, LikesResult, User } from "@/types";

export const useLikes = () => {
  const { isLoading: loading, data: likes } = useCachedPromise(
    async () => {
      const data = (await getUserLikes()) as LikesResult[] | Errors;
      if (Array.isArray(data)) return data;
      throw new Error(data.errors?.join("\n"));
    },
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
