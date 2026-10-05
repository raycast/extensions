import type { PinterestMetadata } from "../api/types";
import type { AttachmentRule, PostFormValues } from "./types";

export const pinterestAttachmentRule: AttachmentRule = {
  allowed: ["image"],
};

export function validatePinterest(values: PostFormValues): void {
  if (values.attachmentType === "none") {
    throw new Error("Pinterest posts require an image attachment.");
  }
  if (values.attachmentType === "video") {
    throw new Error(
      "Pinterest posts do not support video attachments. Please use an image.",
    );
  }
  if (!values.text?.trim()) {
    throw new Error("Pinterest posts require text content");
  }
  if (!values.pinterestBoardId) {
    throw new Error(
      'Pinterest posts require a Board. Please set the "Pinterest Board" field.',
    );
  }
}

export function buildPinterestMetadata(values: PostFormValues) {
  const pinterest: PinterestMetadata = {
    boardServiceId: values.pinterestBoardId ?? "",
  };
  if (values.pinterestTitle) {
    pinterest.title = values.pinterestTitle;
  }
  if (values.pinterestUrl) {
    pinterest.url = values.pinterestUrl;
  }
  return { pinterest };
}
