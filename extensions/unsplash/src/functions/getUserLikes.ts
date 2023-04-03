import { LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";

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
