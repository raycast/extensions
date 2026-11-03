/**
 * Converts Google Chat message text to Markdown for Raycast's Detail view, and to plain text for list titles.
 * Pure: no Raycast imports.
 *
 * Chat formatting: `*bold*`, `_italic_`, `~strike~`, `` `code` ``, ```` ```block``` ````,
 * mentions as `<users/123>` and labelled links as `<https://url|text>`.
 */

import type { Message } from "../api/types";

/** Maps `users/{id}` to a display name. */
export type UserNames = Record<string, string>;

// Private-use characters mark stashed fragments; they never occur in Chat text.
const PLACEHOLDER = (index: number) => `\uE000${index}\uE001`;
const PLACEHOLDER_PATTERN = /\uE000(\d+)\uE001/g;

function mentionLabel(userName: string, names: UserNames): string {
  if (userName === "users/all") return "@all";
  const name = names[userName];
  return `@${name ?? "unknown"}`;
}

/** Replaces `<...>` tokens (mentions and links) via `render`. */
function replaceAngleTokens(
  text: string,
  render: (token: { kind: "mention"; user: string } | { kind: "link"; url: string; label?: string }) => string,
): string {
  return text.replace(/<(users\/[^>|\s]+)>|<((?:https?|mailto):[^>|\s]+)(?:\|([^>]*))?>/g, (_m, user, url, label) =>
    user ? render({ kind: "mention", user }) : render({ kind: "link", url, label: label || undefined }),
  );
}

function escapeLinkText(text: string): string {
  return text.replace(/([[\]])/g, "\\$1");
}

/** Converts Chat's inline markers to Markdown, leaving underscores and asterisks inside words alone. */
function convertInline(text: string): string {
  return (
    text
      // *bold* -> **bold**
      .replace(/(^|[^\w*\\])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, "$1**$2**")
      // ~strike~ -> ~~strike~~
      .replace(/(^|[^\w~\\])~(?=\S)([^~\n]*?\S)~(?![\w~])/g, "$1~~$2~~")
  );
  // _italic_ is the same in Markdown.
}

/**
 * Converts Chat-formatted `text` to Markdown.
 * @param names display names for mentioned users, from {@link mentionNames}.
 */
export function chatToMarkdown(text: string | undefined, names: UserNames = {}): string {
  if (!text) return "";
  const stash: string[] = [];
  const keep = (value: string) => {
    stash.push(value);
    return PLACEHOLDER(stash.length - 1);
  };

  let out = text.replace(/\r\n/g, "\n");
  // Fenced code blocks, which Chat also allows on a single line.
  out = out.replace(/```\n?([\s\S]*?)\n?```/g, (_m, code: string) => keep(`\n\`\`\`\n${code}\n\`\`\`\n`));
  // Inline code.
  out = out.replace(/`([^`\n]+)`/g, (m) => keep(m));
  // Mentions and links.
  out = replaceAngleTokens(out, (token) =>
    token.kind === "mention"
      ? keep(`**${mentionLabel(token.user, names)}**`)
      : keep(token.label ? `[${escapeLinkText(token.label)}](${token.url})` : `<${token.url}>`),
  );
  // Bare URLs: protect them so `_` or `*` inside them aren't treated as formatting.
  out = out.replace(/\bhttps?:\/\/[^\s<>\uE000\uE001]+/g, (m) => keep(m));

  out = convertInline(out);
  // Chat shows single newlines as line breaks; Markdown needs two trailing spaces.
  out = out.replace(/([^\n])\n(?=[^\n])/g, "$1  \n");

  return out.replace(PLACEHOLDER_PATTERN, (_m, i: string) => stash[Number(i)]).trim();
}

/** Strips Chat formatting for one-line titles and snippets. */
export function chatToPlainText(text: string | undefined, names: UserNames = {}): string {
  if (!text) return "";
  let out = text.replace(/```\n?([\s\S]*?)\n?```/g, "$1");
  out = replaceAngleTokens(out, (token) =>
    token.kind === "mention" ? mentionLabel(token.user, names) : (token.label ?? token.url),
  );
  out = out
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, "$1$2")
    .replace(/(^|[^\w~])~(?=\S)([^~\n]*?\S)~(?![\w~])/g, "$1$2")
    .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?![\w_])/g, "$1$2");
  return out.replace(/\s+/g, " ").trim();
}

/** Shortens text to `max` characters with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

/** Display names of users mentioned in a message, from its `USER_MENTION` annotations. */
export function mentionNames(message: Pick<Message, "annotations">, known: UserNames = {}): UserNames {
  const names: UserNames = { ...known };
  for (const annotation of message.annotations ?? []) {
    const user = annotation.userMention?.user;
    if (annotation.type === "USER_MENTION" && user?.name && user.displayName && !names[user.name]) {
      names[user.name] = user.displayName;
    }
  }
  return names;
}

/** Whether a message mentions `userName` (`users/{id}`), `users/me`, or @all. */
export function mentionsUser(message: Pick<Message, "annotations">, userName: string | undefined): boolean {
  return (message.annotations ?? []).some((a) => {
    if (a.type !== "USER_MENTION" || a.userMention?.type === "ADD") return false;
    const mentioned = a.userMention?.user?.name;
    return mentioned === "users/all" || mentioned === "users/me" || (!!userName && mentioned === userName);
  });
}
