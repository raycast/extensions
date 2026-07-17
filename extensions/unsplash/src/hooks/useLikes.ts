import { LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useCachedPromise } from "@raycast/utils";
import { SearchResult, User } from "@/types";

export function useLikes() {
  const {
    isLoading: loading,
    data: likes,
    error,
  } = useCachedPromise(getUserLikes, [], {
    failureToastOptions: { title: "Failed to fetch likes." },
  });
  return { loading, likes, error };
}

async function getUserLikes(): Promise<SearchResult[]> {
  let username = await LocalStorage.getItem<string>("username");
  if (!username) {
    const user = await apiRequest<User>("/me");
    await LocalStorage.setItem("username", user.username);
    username = user.username;
  }
  return apiRequest<SearchResult[]>(`/users/${username}/likes`);
}

export default useLikes;
