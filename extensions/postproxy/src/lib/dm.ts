/** Direct-message capability helpers (mirrors the Postproxy backend network lists). */

const DM_NETWORKS = new Set(["facebook", "instagram", "telegram", "bluesky"]);
const REACTION_NETWORKS = new Set(["facebook", "instagram"]);

export function supportsDMs(platform: string | undefined): boolean {
  return DM_NETWORKS.has((platform ?? "").toLowerCase());
}

export function supportsReactions(platform: string | undefined): boolean {
  return REACTION_NETWORKS.has((platform ?? "").toLowerCase());
}

/** Best-effort public URL of a chat participant on their platform. */
export function participantProfileUrl(
  platform: string | undefined,
  username: string | null | undefined,
  externalId: string | null | undefined,
): string | undefined {
  const handle = username?.trim() || undefined;
  const id = externalId?.trim() || undefined;
  switch ((platform ?? "").toLowerCase()) {
    case "instagram":
      return handle || id ? `https://www.instagram.com/${handle ?? id}/` : undefined;
    case "facebook":
      return id ? `https://www.facebook.com/${id}` : undefined;
    case "telegram":
      return handle ? `https://t.me/${handle}` : undefined;
    case "bluesky":
      return handle || id ? `https://bsky.app/profile/${handle ?? id}` : undefined;
    default:
      return undefined;
  }
}
