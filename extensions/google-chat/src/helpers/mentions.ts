/**
 * @mentions in outgoing messages: placing `<users/{id}>` tokens in the text, rendering them back as
 * `@Name` for a preview, and matching names or emails to space members. Pure: no Raycast imports.
 *
 * Syntax (https://developers.google.com/workspace/chat/format-messages#messages-@mention):
 * `<users/{user}>` in `text` mentions one user, where `{user}` is the Chat user id (the People API
 * person id) or, under user authentication, an email alias. `<users/all>` mentions everyone in the space.
 */

import type { Membership } from "../api/types";
import type { UserNames } from "./chat-format";
import { otherHumanMembers, userDisplayName, type PeopleByUser } from "./dm-names";

/** Resource name that mentions everyone in a space. */
export const ALL_USERS = "users/all";

/** A space member who can be mentioned. */
export interface MentionMember {
  /** `users/{id}` */
  user: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

/** Someone to mention: a member (`users/{id}`) or everyone (`users/all`). */
export interface MentionTarget {
  user: string;
  /** Display name, used to find `@Name` in the text. */
  name?: string;
}

/** Human members of a space other than `me`, with the best known name, email and photo, sorted by name. */
export function mentionMembers(
  memberships: Membership[],
  me: string | undefined,
  people: PeopleByUser = {},
): MentionMember[] {
  const seen = new Set<string>();
  const members: MentionMember[] = [];
  for (const user of otherHumanMembers(memberships, me)) {
    if (seen.has(user.name) || user.name === ALL_USERS) continue;
    seen.add(user.name);
    const email = user.email ?? people[user.name]?.email;
    members.push({
      user: user.name,
      name: userDisplayName(user, people) ?? email ?? "Unknown person",
      email,
      avatarUrl: user.avatarUrl ?? people[user.name]?.photoUrl,
    });
  }
  return members.sort((a, b) => a.name.localeCompare(b.name));
}

/** Keeps only well-formed `users/…` values, e.g. from a stored draft. */
export function sanitizeMentionValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const users = value.filter((v): v is string => typeof v === "string" && /^users\/[^\s<>|]+$/.test(v));
  return [...new Set(users)];
}

// --- Placement --------------------------------------------------------------------------------

type Range = [start: number, end: number];

const CODE_PATTERN = /```[\s\S]*?```|`[^`\n]+`/g;
const ANGLE_TOKEN_PATTERN = /<(?:users\/|https?:|mailto:)[^>\s|]*(?:\|[^>]*)?>/g;
const MENTION_TOKEN_PATTERN = /<(users\/[^>|\s]+)>/g;
/** Letters, digits and underscore in any script: what counts as part of a word. */
const WORD = "\\p{L}\\p{N}_";

function rangesOf(text: string, pattern: RegExp): Range[] {
  return [...text.matchAll(pattern)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
}

/** Inline code and code blocks, where Chat shows text literally. */
function codeRanges(text: string): Range[] {
  return rangesOf(text, CODE_PATTERN);
}

function overlaps(ranges: Range[], start: number, end: number): boolean {
  return ranges.some(([s, e]) => start < e && end > s);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function token(user: string): string {
  return `<${user}>`;
}

/** Whether `<user>` already appears outside code. */
function hasToken(text: string, user: string): boolean {
  const code = codeRanges(text);
  let from = 0;
  for (;;) {
    const at = text.indexOf(token(user), from);
    if (at < 0) return false;
    if (!overlaps(code, at, at + token(user).length)) return true;
    from = at + 1;
  }
}

/** First `@label` (case-insensitive, whole word) outside code, mentions and links. */
function findAtLabel(text: string, labels: string[]): Range | undefined {
  const alternatives = [...new Set(labels.map((l) => l.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((label) => escapeRegExp(label).replace(/\s+/g, "\\s+"));
  if (alternatives.length === 0) return undefined;
  const pattern = new RegExp(`(?<![${WORD}])@(?:${alternatives.join("|")})(?![${WORD}])`, "giu");
  const blocked = [...codeRanges(text), ...rangesOf(text, ANGLE_TOKEN_PATTERN)];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!overlaps(blocked, start, end)) return [start, end];
  }
  return undefined;
}

function fullLabels(target: MentionTarget): string[] {
  if (target.user === ALL_USERS) return ["all", "everyone"];
  return target.name ? [target.name] : [];
}

/** First word of a multi-word display name; undefined for single words and emails. */
function firstName(name: string | undefined): string | undefined {
  const words = name?.trim().split(/\s+/) ?? [];
  if (words.length < 2 || name?.includes("@")) return undefined;
  return words[0];
}

/**
 * Puts a mention token in `text` for each target, in order:
 * - `@Full Name` (then, if no full name matched, `@FirstName`), case-insensitive and as a whole word,
 *   is replaced by `<users/{id}>` at its first occurrence. First names shared by two targets aren't used.
 * - `@all` or `@everyone` is replaced by `<users/all>`.
 * - Targets not found in the text are prepended (`<users/1> <users/2> text`), in order.
 *
 * Text in inline code or code blocks is left alone, and targets already mentioned as `<users/{id}>` are skipped.
 */
export function applyMentions(text: string, targets: MentionTarget[]): string {
  const unique = targets.filter((t, i) => targets.findIndex((other) => other.user === t.user) === i);
  const pending = unique.filter((t) => !hasToken(text, t.user));
  const placed = new Set<string>();
  let out = text;

  const place = (target: MentionTarget, labels: string[]) => {
    const hit = findAtLabel(out, labels);
    if (!hit) return;
    out = `${out.slice(0, hit[0])}${token(target.user)}${out.slice(hit[1])}`;
    placed.add(target.user);
  };

  // Full names first, so "@Sara Lee" goes to Sara Lee even if Sara Khan was picked first.
  for (const target of pending) place(target, fullLabels(target));

  const firstNameCounts = new Map<string, number>();
  for (const target of unique) {
    const first = firstName(target.name)?.toLowerCase();
    if (first) firstNameCounts.set(first, (firstNameCounts.get(first) ?? 0) + 1);
  }
  for (const target of pending) {
    if (placed.has(target.user) || target.user === ALL_USERS) continue;
    const first = firstName(target.name);
    if (first && firstNameCounts.get(first.toLowerCase()) === 1) place(target, [first]);
  }

  const prefix = pending.filter((t) => !placed.has(t.user)).map((t) => token(t.user));
  if (prefix.length === 0) return out;
  return out ? `${prefix.join(" ")} ${out}` : prefix.join(" ");
}

/** Shows mention tokens as `@Name` (`@all` for everyone), leaving code untouched. For previews. */
export function renderMentions(text: string, names: UserNames = {}): string {
  const code = codeRanges(text);
  return text.replace(MENTION_TOKEN_PATTERN, (match: string, user: string, offset: number) => {
    if (overlaps(code, offset, offset + match.length)) return match;
    if (user === ALL_USERS) return "@all";
    return `@${names[user] ?? user.replace(/^users\//, "")}`;
  });
}

// --- Matching names for the AI tool -----------------------------------------------------------

export type MemberMatch =
  { kind: "unique"; target: MentionTarget } | { kind: "ambiguous"; candidates: MentionMember[] } | { kind: "none" };

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds the member a name or email refers to (case-insensitive). Tries, in order: email or `users/{id}`,
 * full name, first name, any word of the name, then part of the name or email. The first rule with
 * exactly one match wins; a rule with several matches is ambiguous. `all`/`everyone` means everyone.
 */
export function matchMember(query: string, members: MentionMember[]): MemberMatch {
  const wanted = normalize(query.replace(/^@/, ""));
  if (!wanted) return { kind: "none" };
  if (wanted === "all" || wanted === "everyone" || wanted === ALL_USERS) {
    return { kind: "unique", target: { user: ALL_USERS, name: "all" } };
  }
  const rules: ((m: MentionMember) => boolean)[] = [
    (m) => m.email?.toLowerCase() === wanted || m.user.toLowerCase() === wanted,
    (m) => normalize(m.name) === wanted,
    (m) => normalize(m.name).split(" ")[0] === wanted,
    (m) => normalize(m.name).split(" ").includes(wanted),
    (m) => normalize(m.name).includes(wanted) || !!m.email?.toLowerCase().split("@")[0].includes(wanted),
  ];
  for (const rule of rules) {
    const matches = members.filter(rule);
    if (matches.length === 1) return { kind: "unique", target: { user: matches[0].user, name: matches[0].name } };
    if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  }
  return { kind: "none" };
}

const MAX_LISTED = 20;

function describeMembers(members: MentionMember[]): string {
  const listed = members.slice(0, MAX_LISTED).map((m) => (m.email ? `${m.name} <${m.email}>` : m.name));
  const more = members.length - listed.length;
  return more > 0 ? `${listed.join("; ")}; and ${more} more` : listed.join("; ");
}

/**
 * Resolves names or emails to mention targets, without duplicates. Throws when one matches nobody
 * (listing the members) or several people (listing them).
 * @param where the conversation's title, for error messages.
 */
export function resolveMentionInputs(inputs: string[], members: MentionMember[], where: string): MentionTarget[] {
  const targets: MentionTarget[] = [];
  for (const input of inputs) {
    if (!input.trim()) continue;
    const match = matchMember(input, members);
    if (match.kind === "none") {
      const known = members.length > 0 ? ` Members: ${describeMembers(members)}.` : "";
      throw new Error(`No one in "${where}" matches "${input.trim()}".${known} Use "all" to mention everyone.`);
    }
    if (match.kind === "ambiguous") {
      throw new Error(
        `"${input.trim()}" matches ${match.candidates.length} people in "${where}": ${describeMembers(match.candidates)}. Use their email or full name.`,
      );
    }
    if (!targets.some((t) => t.user === match.target.user)) targets.push(match.target);
  }
  return targets;
}

/** `users/{id}` -> display name for every target, for {@link renderMentions}. */
export function namesOfTargets(targets: MentionTarget[]): UserNames {
  const names: UserNames = {};
  for (const target of targets) if (target.name) names[target.user] = target.name;
  return names;
}
