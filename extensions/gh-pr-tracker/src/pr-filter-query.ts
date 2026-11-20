import type { PRWithActivity } from "./types";

export interface FieldMatch {
  include: string[];
  exclude: string[];
}

export interface CompiledPrFilter {
  raw: string;
  assignee: FieldMatch;
  author: FieldMatch;
  involves: FieldMatch;
  reviewRequested: FieldMatch;
  label: FieldMatch;
  draft?: boolean;
  freeText: string[];
}

type FieldKey = "assignee" | "author" | "involves" | "reviewRequested" | "label";

const QUALIFIER_KEYS: Record<string, FieldKey> = {
  assignee: "assignee",
  author: "author",
  involves: "involves",
  "review-requested": "reviewRequested",
  label: "label",
};

function emptyField(): FieldMatch {
  return { include: [], exclude: [] };
}

function tokenize(query: string): string[] {
  return query.match(/(?:[^\s"]|"[^"]*")+/g) ?? [];
}

function stripQuotes(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

/** Strips fallback free-text token quotes, keeping any leading "-" literal. */
function stripQuotesFromFreeText(token: string): string {
  if (token.startsWith("-")) return "-" + stripQuotes(token.slice(1));
  return stripQuotes(token);
}

function normalizeLogin(value: string): string {
  return value.toLowerCase();
}

function normalizeMaybeMe(value: string, viewerLogin: string | undefined): string {
  return value.toLowerCase() === "@me" ? (viewerLogin ?? value).toLowerCase() : value.toLowerCase();
}

export function queryMightReferenceMe(query: string): boolean {
  return query.toLowerCase().includes("@me");
}

export function compilePrFilterQuery(query: string, viewerLogin: string | undefined): CompiledPrFilter {
  const compiled: CompiledPrFilter = {
    raw: query,
    assignee: emptyField(),
    author: emptyField(),
    involves: emptyField(),
    reviewRequested: emptyField(),
    label: emptyField(),
    draft: undefined,
    freeText: [],
  };

  for (const rawToken of tokenize(query)) {
    const negated = rawToken.startsWith("-") && rawToken.length > 1;
    const token = negated ? rawToken.slice(1) : rawToken;
    const colonIndex = token.indexOf(":");

    if (colonIndex <= 0) {
      compiled.freeText.push(stripQuotesFromFreeText(rawToken).toLowerCase());
      continue;
    }

    const key = token.slice(0, colonIndex).toLowerCase();
    let rawValue = token.slice(colonIndex + 1).trim();

    // Strip trailing commas (tokenizer includes them as part of the token)
    rawValue = rawValue.replace(/,+$/, "");

    if (key === "draft") {
      const value = stripQuotes(rawValue).toLowerCase();
      if (value === "true" || value === "false") {
        const draft = value === "true";
        compiled.draft = negated ? !draft : draft;
      } else {
        compiled.freeText.push(stripQuotesFromFreeText(rawToken).toLowerCase());
      }
      continue;
    }

    const field = QUALIFIER_KEYS[key];
    if (!field || rawValue === "") {
      compiled.freeText.push(stripQuotesFromFreeText(rawToken).toLowerCase());
      continue;
    }

    const values = rawValue
      .split(",")
      .map((value) => stripQuotes(value.trim()))
      .filter(Boolean)
      .map((value) => (field === "label" ? value.toLowerCase() : normalizeMaybeMe(value, viewerLogin)));

    if (values.length === 0) {
      compiled.freeText.push(stripQuotesFromFreeText(rawToken).toLowerCase());
      continue;
    }

    const bucket = negated ? compiled[field].exclude : compiled[field].include;
    bucket.push(...values);
  }

  return compiled;
}

function fieldMatches(field: FieldMatch, values: string[]): boolean {
  if (field.exclude.length > 0 && values.some((value) => field.exclude.includes(value))) return false;
  if (field.include.length > 0 && !values.some((value) => field.include.includes(value))) return false;
  return true;
}

function involvesLogins(pr: PRWithActivity): string[] {
  const logins = new Set<string>();
  logins.add(normalizeLogin(pr.user.login));
  for (const user of pr.assignees) logins.add(normalizeLogin(user.login));
  for (const user of pr.requested_reviewers) logins.add(normalizeLogin(user.login));
  for (const review of pr.reviews) logins.add(normalizeLogin(review.user.login));
  for (const comment of pr.reviewComments) logins.add(normalizeLogin(comment.user.login));
  for (const comment of pr.issueComments) logins.add(normalizeLogin(comment.user.login));
  for (const commit of pr.commits) {
    if (commit.author) logins.add(normalizeLogin(commit.author.login));
  }
  return [...logins];
}

export function matchesPrFilter(pr: PRWithActivity, compiled: CompiledPrFilter): boolean {
  if (
    !fieldMatches(
      compiled.assignee,
      pr.assignees.map((user) => normalizeLogin(user.login)),
    )
  )
    return false;
  if (!fieldMatches(compiled.author, [normalizeLogin(pr.user.login)])) return false;
  if (
    !fieldMatches(
      compiled.reviewRequested,
      pr.requested_reviewers.map((user) => normalizeLogin(user.login)),
    )
  )
    return false;
  if (!fieldMatches(compiled.involves, involvesLogins(pr))) return false;
  if (
    !fieldMatches(
      compiled.label,
      pr.labels.map((label) => label.name.toLowerCase()),
    )
  )
    return false;
  if (compiled.draft !== undefined && pr.draft !== compiled.draft) return false;

  if (compiled.freeText.length > 0) {
    const title = pr.title.toLowerCase();
    if (!compiled.freeText.every((word) => title.includes(word))) return false;
  }

  return true;
}
