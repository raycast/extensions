import { validateUrl } from "../helpers/validation";
import type { FacebookMetadata } from "../api/types";
import type { AttachmentRule, NetworkContext, PostFormValues } from "./types";

export const facebookAttachmentRule: AttachmentRule = {
  allowed: ["none", "image", "video"],
};

export function validateFacebook(
  values: PostFormValues,
  ctx: NetworkContext,
): void {
  if (ctx.isFacebookGroup) return;
  if (values.facebookLinkAttachment) {
    validateUrl(values.facebookLinkAttachment, "Link attachment URL");
    if (values.attachmentType === "video") {
      throw new Error(
        "A link attachment cannot be combined with a video asset",
      );
    }
  }
}

export function buildFacebookMetadata(
  values: PostFormValues,
  ctx: NetworkContext,
) {
  if (ctx.isFacebookGroup) {
    // Facebook Groups only support the "post" type; no first comment or link attachment
    return { facebook: { type: "post" as const } };
  }

  const facebook: FacebookMetadata = {
    type: (values.facebookPostType as FacebookMetadata["type"]) ?? "post",
  };
  if (values.facebookFirstComment) {
    facebook.firstComment = values.facebookFirstComment;
  }
  if (values.facebookLinkAttachment) {
    facebook.linkAttachment = { url: values.facebookLinkAttachment };
  }
  return { facebook };
}
