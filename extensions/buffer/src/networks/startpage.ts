import type { AttachmentRule, PostFormValues } from "./types";

export const startPageAttachmentRule: AttachmentRule = {
  allowed: ["none", "image"],
};

export function validateStartPage(values: PostFormValues): void {
  if (!values.text?.trim()) {
    throw new Error("Start Page posts require text content");
  }
}
