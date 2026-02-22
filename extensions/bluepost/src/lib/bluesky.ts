import { getPreferenceValues } from "@raycast/api";
import { AtpAgent, RichText } from "@atproto/api";
import type { AppBskyEmbedExternal, AppBskyFeedPost } from "@atproto/api";

export async function login(): Promise<AtpAgent> {
  const { blueskyHandle, blueskyAppPassword } =
    getPreferenceValues<Preferences>();
  const agent = new AtpAgent({ service: "https://bsky.social" });
  const identifier = blueskyHandle.startsWith("@")
    ? blueskyHandle.slice(1)
    : blueskyHandle;
  await agent.login({ identifier, password: blueskyAppPassword });
  return agent;
}

export async function createPost(
  agent: AtpAgent,
  params: {
    text: string;
    url?: string;
    images?: Array<{ data: Uint8Array; mimeType: string; alt?: string }>;
  },
): Promise<{ uri: string; cid: string }> {
  const rt = new RichText({ text: params.text });
  await rt.detectFacets(agent);

  const record: Partial<AppBskyFeedPost.Record> = {
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };

  if (params.url && (!params.images || params.images.length === 0)) {
    record.embed = {
      $type: "app.bsky.embed.external" as const,
      external: {
        uri: params.url,
        title: "",
        description: "",
      },
    } satisfies AppBskyEmbedExternal.Main & { $type: string };
  }

  if (params.images && params.images.length > 0) {
    const uploadedImages = await Promise.all(
      params.images.map(async (img) => {
        const response = await agent.uploadBlob(img.data, {
          encoding: img.mimeType,
        });
        return {
          alt: img.alt ?? "",
          image: response.data.blob,
          aspectRatio: undefined,
        };
      }),
    );
    record.embed = {
      $type: "app.bsky.embed.images",
      images: uploadedImages,
    };
  }

  return agent.post(record as AppBskyFeedPost.Record);
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  images: Array<{ url: string; alt: string; mimeType: string }>;
  hasMedia: boolean;
  autoPost: boolean;
}

export async function fetchRecentPosts(
  agent: AtpAgent,
  limit = 20,
): Promise<BlueskyPost[]> {
  const did = agent.session?.did;
  if (!did) throw new Error("Not logged in");

  const response = await agent.getAuthorFeed({
    actor: did,
    limit,
    filter: "posts_no_replies",
  });

  return response.data.feed
    .filter((item) => {
      if (item.post.author.did !== did || item.reason) return false;
      const rec = item.post.record as AppBskyFeedPost.Record;
      // Exclude replies (posts with a reply parent)
      if (rec.reply) return false;
      // Exclude posts starting with a mention (directed at another user)
      if (rec.text.startsWith("@")) return false;
      return true;
    })
    .map((item) => {
      const record = item.post.record as AppBskyFeedPost.Record;
      const images: BlueskyPost["images"] = [];

      const embed = item.post.embed;
      if (
        embed &&
        "$type" in embed &&
        embed.$type === "app.bsky.embed.images#view"
      ) {
        const imgEmbed = embed as {
          images: Array<{ fullsize: string; alt: string }>;
        };
        for (const img of imgEmbed.images) {
          images.push({
            url: img.fullsize,
            alt: img.alt,
            mimeType: "image/jpeg",
          });
        }
      }

      const { automatedPostUrl } = getPreferenceValues<Preferences>();
      const autoPost = isAutomatedPost(
        embed,
        record.embed,
        automatedPostUrl,
        record.facets,
      );

      return {
        uri: item.post.uri,
        cid: item.post.cid,
        text: record.text,
        createdAt: record.createdAt,
        images,
        hasMedia: images.length > 0,
        autoPost,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepGet(obj: any, ...keys: string[]): unknown {
  let cur = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

export function isAutomatedPost(
  viewEmbed: unknown,
  recordEmbed: unknown,
  urlPrefix?: string,
  facets?: AppBskyFeedPost.Record["facets"],
): boolean {
  if (!urlPrefix) return false;
  const prefix = urlPrefix.replace(/\/+$/, "");

  // View embed: { external: { uri } }
  const viewUri = deepGet(viewEmbed, "external", "uri");
  if (
    typeof viewUri === "string" &&
    viewUri.replace(/\/+$/, "").startsWith(prefix)
  ) {
    return true;
  }

  // Record embed: { external: { uri } }
  const recUri = deepGet(recordEmbed, "external", "uri");
  if (
    typeof recUri === "string" &&
    recUri.replace(/\/+$/, "").startsWith(prefix)
  ) {
    return true;
  }

  // Facet links: inline URLs in the post text
  if (facets) {
    for (const facet of facets) {
      for (const feature of facet.features) {
        if (feature.$type === "app.bsky.richtext.facet#link") {
          const uri = (feature as { uri: string }).uri;
          if (uri.replace(/\/+$/, "").startsWith(prefix)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export async function downloadBlob(
  url: string,
): Promise<{ blob: Blob; buffer: Uint8Array; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const blob = await res.blob();
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const mimeType = blob.type || "image/png";
  return { blob, buffer, mimeType };
}
