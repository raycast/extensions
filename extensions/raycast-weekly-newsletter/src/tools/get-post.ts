import { fetchPost, getPostUrl } from "../api/substack";
import { htmlToMarkdown } from "../utils/html-to-markdown";

type Input = {
  /** The post slug returned by List Raycast Weekly Posts. */
  slug: string;
};

/** Read the full text of a Raycast Weekly newsletter post. */
export default async function tool({ slug }: Input) {
  const post = await fetchPost(slug);

  return {
    title: post.title,
    subtitle: post.subtitle,
    publishedAt: post.post_date,
    url: getPostUrl(post.slug),
    content: htmlToMarkdown(post.body_html),
  };
}
