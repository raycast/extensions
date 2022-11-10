import { URL } from "node:url";

export default function getPublisher(urlAsString: string): string | null {
  try {
    const url = new URL(urlAsString);
    return url.hostname;
  } catch {
    // Because we don't treat invalid URLs as invalid bookmarks, we don't
    // necessarily want to break here. So we'll return null, since we don't
    // know who the publisher is.
    return null;
  }
}
