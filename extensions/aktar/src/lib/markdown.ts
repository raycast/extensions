// File names and keys come from buckets, where anyone with write access can
// pick them, and links are built from them. Before going into Markdown they
// are escaped, so a name like `![](https://host/p.png)` stays text instead of
// making Raycast load an image, and a key with spaces or parentheses can't
// end a link early.

/** `text` with the characters that start Markdown links, images, code, emphasis or HTML backslash-escaped, on one line. */
export function escapeMarkdown(text: string) {
  return text.replace(/[\r\n]+/g, " ").replace(/[\\`*_[\]()!#<>|~]/g, "\\$&");
}

/** `text` for the text of a Markdown link that's copied: only what could end the link is escaped, so it stays readable. */
export function escapeLinkText(text: string) {
  return text.replace(/[\r\n]+/g, " ").replace(/[\\[\]]/g, "\\$&");
}

/** `url` safe as a Markdown link or image target: spaces, parentheses and angle brackets percent-encoded. */
export function markdownURL(url: string) {
  return url.replace(/[\s()<>]/g, (character) =>
    character === " " ? "%20" : `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

/** Control and text-direction characters, which can hide or reorder text. */
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** Text from a bucket for an AI tool's result: without control or text-direction characters. */
export function cleanText(text: string) {
  return text.replace(UNSAFE_CHARACTERS, "?");
}
