import { Product, User, Topic } from "../types";
import { ApiPostNode, ApiUser } from "./queries";
import { cleanText } from "../util/textUtils";

// The PH public (client-credentials) API redacts makers to "[REDACTED]" with id "0".
// Maker identity requires a user-context OAuth token, which is out of scope. Drop redacted entries.
function isRedactedUser(u: ApiUser): boolean {
  return u.id === "0" || u.name === "[REDACTED]" || u.username === "[REDACTED]";
}

function apiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    name: cleanText(u.name),
    username: u.username,
    avatarUrl: u.profileImage ?? "",
    profileImage: u.profileImage,
    profileUrl: u.url,
    headline: u.headline ? cleanText(u.headline) : undefined,
    twitterUsername: u.twitterUsername,
    websiteUrl: u.websiteUrl,
  };
}

function apiTopicsToTopics(node: ApiPostNode): Topic[] {
  return (
    node.topics?.edges?.map((e) => ({
      id: e.node.id,
      name: cleanText(e.node.name),
      slug: e.node.slug,
      description: e.node.description,
    })) ?? []
  );
}

// Shared mapping used by both list and detail. Detail adds media-derived gallery.
function baseMap(node: ApiPostNode): Product {
  const visibleApiMakers = node.makers?.filter((m) => !isRedactedUser(m));
  const rawMakers = visibleApiMakers?.map(apiUserToUser);
  const makers = rawMakers && rawMakers.length > 0 ? rawMakers : undefined;
  return {
    id: node.id,
    name: cleanText(node.name),
    tagline: cleanText(node.tagline),
    description: cleanText(node.description ?? ""),
    url: node.url,
    thumbnail: node.thumbnail?.url ?? "",
    featuredImage: node.thumbnail?.url,
    votesCount: node.votesCount ?? 0,
    commentsCount: node.commentsCount ?? 0,
    createdAt: node.featuredAt ?? node.createdAt,
    // maker/makers come ONLY from the API's `makers` (the documented maker role). On a public token
    // these are redacted and filtered out, leaving these undefined — that's correct: we cannot see
    // real makers, so we do not invent them from `user`.
    maker: makers ? makers[0] : undefined,
    makers,
    // Do NOT infer hunter from `user`; the public API has no verified hunter field (spec Locked Decision).
    hunter: undefined,
    // `Post.user` is "User who created the Post" — the submitter, a distinct documented role.
    // Modeled separately and labeled "Posted by"; never relabeled as maker or hunter.
    submittedBy: node.user && !isRedactedUser(node.user) ? apiUserToUser(node.user) : undefined,
    topics: apiTopicsToTopics(node),
  };
}

export function postNodeToProduct(node: ApiPostNode): Product {
  return baseMap(node);
}

export function postDetailToProduct(node: ApiPostNode): Product {
  const product = baseMap(node);
  const galleryImages = (node.media ?? []).map((m) => m.url).filter((u) => u.length > 0);
  return {
    ...product,
    galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
  };
}
