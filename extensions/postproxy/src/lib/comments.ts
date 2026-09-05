import type { Post, Profile } from "./types";

/** Networks whose post comments are exposed by the Postproxy Comments API. */
const COMMENTABLE = new Set(["instagram", "facebook", "threads", "youtube", "linkedin"]);

export function supportsComments(platform: string | undefined): boolean {
  return COMMENTABLE.has((platform ?? "").toLowerCase());
}

export interface CommentTarget {
  profileId: string;
  platform: string;
  name: string;
}

/**
 * Resolve which profile(s) a post's comments could belong to. The posts API only
 * reports the network per outcome (not the exact profile), so we match connected
 * profiles by network and let the caller disambiguate when more than one matches.
 */
export function commentTargets(post: Post, profiles: Profile[]): CommentTarget[] {
  const networks = new Set(
    post.platforms.map((outcome) => outcome.platform.toLowerCase()).filter((p) => supportsComments(p)),
  );
  return profiles
    .filter((profile) => networks.has(profile.platform.toLowerCase()))
    .map((profile) => ({ profileId: profile.id, platform: profile.platform, name: profile.name }));
}
