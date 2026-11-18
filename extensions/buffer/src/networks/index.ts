import { facebookAttachmentRule } from "./facebook";
import { googleBusinessAttachmentRule } from "./google-business";
import { instagramAttachmentRule } from "./instagram";
import { mastodonAttachmentRule } from "./mastodon";
import { pinterestAttachmentRule } from "./pinterest";
import { startPageAttachmentRule } from "./startpage";
import { tiktokAttachmentRule } from "./tiktok";
import { youtubeAttachmentRule } from "./youtube";
import type { AttachmentKind, AttachmentRule } from "./types";

export * from "./types";
export * from "./facebook";
export * from "./google-business";
export * from "./instagram";
export * from "./mastodon";
export * from "./pinterest";
export * from "./startpage";
export * from "./tiktok";
export * from "./youtube";

export const ATTACHMENT_TYPES: { value: AttachmentKind; title: string }[] = [
  { value: "none", title: "No Attachment" },
  { value: "image", title: "Image" },
  { value: "video", title: "Video" },
];

// Only these services ever support a user-facing choice between automatic/notification
// scheduling. Facebook Groups and Instagram Profiles are forced to notification-only
// (see resolveSchedulingType); everything else is forced to automatic-only.
export const NOTIFICATION_CAPABLE_SERVICES = new Set([
  "instagram",
  "tiktok",
  "youtube",
]);

const DEFAULT_RULE: AttachmentRule = { allowed: ["none", "image", "video"] };

// Services without a dedicated network module (e.g. Twitter, LinkedIn, Threads, Bluesky)
// all fall back to DEFAULT_RULE, same as n8n where they have no per-network description
// or validation file either.
const SERVICE_ATTACHMENT_RULES: Record<string, AttachmentRule> = {
  instagram: instagramAttachmentRule,
  tiktok: tiktokAttachmentRule,
  youtube: youtubeAttachmentRule,
  pinterest: pinterestAttachmentRule,
  google: googleBusinessAttachmentRule,
  googlebusiness: googleBusinessAttachmentRule,
  google_business: googleBusinessAttachmentRule,
  startpage: startPageAttachmentRule,
  facebook: facebookAttachmentRule,
  mastodon: mastodonAttachmentRule,
};

export function getAttachmentRule(service?: string): AttachmentRule {
  if (!service) return DEFAULT_RULE;
  return SERVICE_ATTACHMENT_RULES[service.toLowerCase()] ?? DEFAULT_RULE;
}

export function getAllowedAttachmentTypes(service?: string) {
  const rule = getAttachmentRule(service);
  return ATTACHMENT_TYPES.filter((a) => rule.allowed.includes(a.value));
}
