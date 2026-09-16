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
    const user = await apiRequest<User>("/me", { requireUserAuth: true });
    await LocalStorage.setItem("username", user.username);
    username = user.username;
  }
  // /users/:username/likes is paginated (max 30 per page); a single request
  // only returns the most recent page, hiding every older liked image.
  const perPage = 30;
  const likes: SearchResult[] = [];
  for (let page = 1; ; page += 1) {
    const pageLikes = await apiRequest<SearchResult[]>(`/users/${username}/likes?per_page=${perPage}&page=${page}`, {
      requireUserAuth: true,
    });
    likes.push(...pageLikes);
    if (pageLikes.length < perPage) break;
  }
  return likes;
}

export default useLikes;
