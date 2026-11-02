import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchPosts, markSeen } from "./feed";

export default async function Command() {
  try {
    const posts = await fetchPosts();
    if (posts.length === 0) {
      await showHUD("No blog posts found");
      return;
    }
    const post = posts[Math.floor(Math.random() * posts.length)];
    await open(post.url);
    await markSeen([post.id]);
    await showHUD(`Opening “${post.title}”`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open a random post" });
  }
}
