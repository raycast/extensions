import { fetchPosts, getPostUrl } from "../api/substack";

/** List the ten most recent Raycast Weekly newsletter posts. */
export default async function tool() {
  const posts = await fetchPosts();

  return posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    subtitle: post.subtitle,
    description: post.description,
    publishedAt: post.post_date,
    url: getPostUrl(post.slug),
  }));
}
