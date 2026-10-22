import { isAttachment, type Attachment } from "@type/octarine";

export const ALL_EXTENSIONS = "all";

export type IndexedAttachment = Attachment & {
  searchText: string;
};

export function isIndexedAttachment(value: unknown): value is IndexedAttachment {
  return isAttachment(value) && typeof (value as IndexedAttachment).searchText === "string";
}
