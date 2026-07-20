import { listSocialSets } from "../lib/api";

function resolveUsername(ss: {
  twitter?: { username?: string | null } | null;
  linkedin?: { vanity_name?: string | null } | null;
  instagram?: { username?: string | null } | null;
  tiktok?: { username?: string | null } | null;
}) {
  return ss.twitter?.username || ss.linkedin?.vanity_name || ss.instagram?.username || ss.tiktok?.username || null;
}

function getConnectedPlatformLabels(ss: {
  twitter?: unknown;
  linkedin?: unknown;
  instagram?: unknown;
  tiktok?: unknown;
}) {
  const labels: string[] = [];
  if (ss.twitter) labels.push("Twitter");
  if (ss.linkedin) labels.push("LinkedIn");
  if (ss.instagram) labels.push("Instagram");
  if (ss.tiktok) labels.push("TikTok");
  return labels;
}

export default async function tool() {
  const socialSets = await listSocialSets();

  const results = socialSets.map((ss) => {
    return {
      id: ss.account_id,
      name: ss.account_name,
      owner: ss.account_owner,
      username: resolveUsername(ss),
      platforms: getConnectedPlatformLabels(ss),
    };
  });

  return results;
}
