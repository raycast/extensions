/**
 * Asks Instagram itself for a post, the way instagram.com's own web client does when it is not
 * signed in: one GET to its web query endpoint, from this Mac, with no third party in between.
 *
 * The trade-off: Instagram rate-limits signed-out requests per network, answering 401 ("Please
 * wait a few minutes") or an empty result, and the query id below changes when Instagram ships a
 * new web client. Both are reported in words, and the browser tab remains the other way in.
 */
import axios from "axios";

const QUERY_URL = "https://www.instagram.com/graphql/query";
/** The web client's post query. If Instagram retires it, every reply comes back empty. */
const POST_QUERY_ID = "8845758582119845";
const WEB_APP_ID = "936619743392459";
const TIMEOUT_MS = 15_000;
const REPLY_EXCERPT_LENGTH = 500;

type Node = { __typename?: unknown; display_url?: unknown; video_url?: unknown; is_video?: unknown };
type PostNode = Node & { edge_sidecar_to_children?: { edges?: { node?: Node }[] } | null };

export class InstagramReplyError extends Error {
  constructor(
    message: string,
    /** Rate limits and empty replies pass; a missing post does not. */
    readonly retryable: boolean,
    readonly details: string,
  ) {
    super(message);
  }
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** One item's file: the video for a video, never its poster. */
function nodeUrl(node: Node | undefined, isVideo: boolean): string | null {
  if (!node) return null;
  return isVideo ? httpsUrl(node.video_url) : httpsUrl(node.display_url);
}

/** The post's media URLs from a query reply, or null unless every item has its file. */
export function mediaFromQueryReply(body: unknown): string[] | null {
  const media = (body as { data?: { xdt_shortcode_media?: PostNode | null } } | null)?.data?.xdt_shortcode_media;
  if (!media) return null;

  switch (media.__typename) {
    case "XDTGraphImage": {
      const url = nodeUrl(media, false);
      return url ? [url] : null;
    }
    case "XDTGraphVideo": {
      const url = nodeUrl(media, true);
      return url ? [url] : null;
    }
    case "XDTGraphSidecar": {
      const edges = media.edge_sidecar_to_children?.edges ?? [];
      const urls = edges.map(({ node }) => nodeUrl(node, node?.is_video === true || node?.video_url != null));
      return urls.length > 0 && urls.every((url): url is string => url !== null) ? urls : null;
    }
    default:
      return null;
  }
}

/** Signed CDN links carry live credentials in their query; error text keeps only the path. */
export function stripUrlSecrets(text: string): string {
  return text.replace(/https?:(?:\\?\/){2}[^\s"'<>]+/g, (url) => url.split("?")[0]);
}

/** A failed reply in words, whether it is worth retrying, and a redacted excerpt for Copy Error. */
export function describeInstagramReply(status: number, body: unknown): InstagramReplyError {
  const raw = stripUrlSecrets(typeof body === "string" ? body : JSON.stringify(body ?? ""));
  const excerpt = raw.length > REPLY_EXCERPT_LENGTH ? `${raw.slice(0, REPLY_EXCERPT_LENGTH)}…` : raw;
  const details = `HTTP ${status}\nReply: ${excerpt}`;

  const named = (body as { data?: { xdt_shortcode_media?: unknown } } | null)?.data?.xdt_shortcode_media;
  if (status === 200 && named) {
    return new InstagramReplyError("Instagram's reply is missing some of the post's files.", false, details);
  }
  if (status === 200 || status === 401 || status === 429) {
    return new InstagramReplyError("Instagram is rate-limiting requests from your network.", true, details);
  }
  if (status === 400 || status === 403 || status === 404) {
    return new InstagramReplyError(
      `Instagram says the post may be private or deleted (HTTP ${status}).`,
      false,
      details,
    );
  }
  return new InstagramReplyError(`Instagram is having trouble (HTTP ${status}).`, status >= 500, details);
}

/** The request as one line for Copy Error; it carries nothing secret. */
export function describeRequest(shortcode: string): string {
  return `GET ${QUERY_URL}?doc_id=${POST_QUERY_ID}&variables={"shortcode":"${shortcode}"}`;
}

/** Ask Instagram for the post's media; throws `InstagramReplyError` for any reply without it. */
export async function fetchPostFromInstagram(shortcode: string, signal?: AbortSignal): Promise<string[]> {
  const response = await axios.get(QUERY_URL, {
    params: { doc_id: POST_QUERY_ID, variables: JSON.stringify({ shortcode }) },
    timeout: TIMEOUT_MS,
    signal,
    // Read every reply's body: a 401 says why.
    validateStatus: () => true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "X-IG-App-ID": WEB_APP_ID,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `https://www.instagram.com/p/${shortcode}/`,
      Origin: "https://www.instagram.com",
    },
  });

  const media = response.status === 200 ? mediaFromQueryReply(response.data) : null;
  if (media) return media;
  throw describeInstagramReply(response.status, response.data);
}

export const INSTAGRAM_TIMEOUT_SECONDS = TIMEOUT_MS / 1000;
