import RedditResultItem from "../RedditApi/RedditResultItem";
import { relativeTime, absoluteTime } from "./formatDate";

/**
 * Builds the markdown body shared by the inline detail pane and the pushed
 * post view, so the two can never drift apart.
 *
 * The body prefers the post's own text, then an embedded image, then a bare
 * content/permalink URL — matching what each result actually carries.
 */
export function postMarkdown(data: RedditResultItem): string {
  const when = relativeTime(data.created);
  const meta = [when && `Posted ${when}`, data.subreddit && `r/${data.subreddit}`].filter(Boolean).join(" · ");

  let body: string;
  if (data.description) {
    body = data.description;
  } else if (data.imageUrl) {
    body = `![${data.title}](${data.imageUrl})`;
  } else {
    body = data.contentUrl || data.url;
  }

  const header = meta ? `# ${data.title}\n\n_${meta}_` : `# ${data.title}`;
  return `${header}\n\n${body}`;
}

/** The absolute timestamp, for a detail-pane tooltip or navigation subtitle. */
export function postTimestamp(data: RedditResultItem): string {
  return absoluteTime(data.created);
}
