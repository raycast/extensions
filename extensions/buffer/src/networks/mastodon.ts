import type { AttachmentRule, PostFormValues } from "./types";

export const mastodonAttachmentRule: AttachmentRule = {
  allowed: ["none", "image", "video"],
};

export function validateMastodon(values: PostFormValues): void {
  if (values.attachmentType === "none" && !values.text?.trim()) {
    throw new Error("Mastodon posts require text, an image, or a video");
  }
}
