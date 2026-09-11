import type { AttachmentRule, PostFormValues } from "./types";

export const tiktokAttachmentRule: AttachmentRule = {
  allowed: ["image", "video"],
};

export function validateTiktok(values: PostFormValues): void {
  if (values.attachmentType === "none") {
    throw new Error(
      'TikTok posts require an image or video attachment. Please set the "Attachment Type" field.',
    );
  }
}
