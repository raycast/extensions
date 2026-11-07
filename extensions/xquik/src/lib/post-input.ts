const POST_LINK = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:\w+|i(?:\/web)?)\/status(?:es)?\/(\d+)/i;

// A copied post link carries its ID, and anything else on the clipboard is ignored.
export function postFromClipboard(text: string | undefined): string | undefined {
  return text?.trim().match(POST_LINK)?.[1];
}
