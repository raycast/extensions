import type { InstagramMetadata } from "../api/types";
import type { AttachmentRule, NetworkContext, PostFormValues } from "./types";

export const instagramAttachmentRule: AttachmentRule = {
  allowed: ["image", "video"],
};

export function validateInstagram(
  values: PostFormValues,
  ctx: NetworkContext,
): void {
  if (ctx.isInstagramProfile) return;
  if (values.attachmentType === "none") {
    throw new Error(
      'Instagram posts require an image or video attachment. Please set the "Attachment Type" field.',
    );
  }
}

export function buildInstagramMetadata(
  values: PostFormValues,
  ctx: NetworkContext,
) {
  if (ctx.isInstagramProfile) {
    // Instagram Profiles only support the "post" type, with no first comment or link.
    // shouldShareToFeed has no real effect for a personal profile, but the API schema
    // requires the field to be present, so it defaults to true.
    return { instagram: { type: "post" as const, shouldShareToFeed: true } };
  }

  const instagram: InstagramMetadata = {
    type: (values.instagramPostType as InstagramMetadata["type"]) ?? "post",
    shouldShareToFeed: values.instagramShareToFeed ?? true,
  };
  if (values.instagramFirstComment) {
    instagram.firstComment = values.instagramFirstComment;
  }
  if (values.instagramLink) {
    instagram.link = values.instagramLink;
  }
  return { instagram };
}
