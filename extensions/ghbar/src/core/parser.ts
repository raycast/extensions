import {
  Catalog,
  CatalogRepository,
  EMPTY_SOCIAL,
  Item,
  ItemKind,
  RateLimit,
  SectionKind,
  Snapshot,
  Social,
  Viewer,
} from "./models";

export type ParseErrorKind = "malformed" | "graphQL";

export class ParseError extends Error {
  readonly kind: ParseErrorKind;
  readonly detail: string;

  constructor(kind: ParseErrorKind, detail: string) {
    super(`${kind}: ${detail}`);
    this.name = "ParseError";
    this.kind = kind;
    this.detail = detail;
  }
}

/** GitHub's search ceiling. Hitting it means results were truncated. */
export const SEARCH_LIMIT = 100;

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Validates an ISO 8601 string, returning it unchanged; null if unparseable. */
function validIso(value: unknown): string | null {
  const text = asString(value);
  if (text === null) return null;
  return Number.isNaN(Date.parse(text)) ? null : text;
}

/** Turns an already-parsed JSON value into a `Snapshot`. */
export function parseSnapshot(payload: unknown): Snapshot {
  const root = asObject(payload);
  if (root === null) {
    throw new ParseError("malformed", "root is not an object");
  }

  const errors = asArray(root.errors);
  if (errors.length > 0) {
    const message = asString(asObject(errors[0])?.message);
    if (message !== null) {
      throw new ParseError("graphQL", message);
    }
  }

  const data = asObject(root.data);
  if (data === null) {
    throw new ParseError("malformed", "missing data");
  }

  const viewerObject = asObject(data.viewer);
  const login = asString(viewerObject?.login);
  const avatar = asString(viewerObject?.avatarUrl);
  if (viewerObject === null || login === null || avatar === null) {
    throw new ParseError("malformed", "missing viewer");
  }

  const organizationNodes = asArray(asObject(viewerObject.organizations)?.nodes);
  const viewer: Viewer = {
    login,
    name: asString(viewerObject.name),
    avatarURL: avatar,
    organizations: organizationNodes
      .map((node) => asString(asObject(node)?.login))
      .filter((v): v is string => v !== null),
  };

  const truncated: SectionKind[] = [];

  const search = (key: string, kind: ItemKind, section: SectionKind): Item[] => {
    const object = asObject(data[key]);
    if (object === null) {
      throw new ParseError("malformed", `missing ${key}`);
    }
    const count = asNumber(object.issueCount);
    if (count !== null && count >= SEARCH_LIMIT) {
      truncated.push(section);
    }
    return asArray(object.nodes)
      .map((node) => parseItem(node, kind))
      .filter((item): item is Item => item !== null);
  };

  const prs = search("prs", "pullRequest", "pullRequests");
  const issues = search("issues", "issue", "issues");
  const review = search("review", "pullRequest", "reviewRequested");
  const changesRequested = search("changesRequested", "pullRequest", "changesRequested");
  const myPullRequests = search("myPullRequests", "pullRequest", "myPullRequests");

  const limitObject = asObject(data.rateLimit);
  const limit = asNumber(limitObject?.limit);
  const remaining = asNumber(limitObject?.remaining);
  const resetAt = validIso(limitObject?.resetAt);
  if (limit === null || remaining === null || resetAt === null) {
    throw new ParseError("malformed", "missing rateLimit");
  }
  const rateLimit: RateLimit = { limit, remaining, resetAt };

  return {
    viewer,
    social: parseSocial(viewerObject),
    prs,
    issues,
    review,
    changesRequested,
    myPullRequests,
    rateLimit,
    truncated,
  };
}

/**
 * Missing counters fall back to zero rather than throwing. They are menu
 * decoration; losing the pending-work list over one of them would be
 * disproportionate, and narrow token scopes legitimately omit them.
 */
function parseSocial(viewer: Json): Social {
  const count = (key: string): number => asNumber(asObject(viewer[key])?.totalCount) ?? 0;

  const repositories = asObject(viewer.repositories);
  if (repositories === null) {
    return EMPTY_SOCIAL;
  }

  const nodes = asArray(repositories.nodes);
  const stars = nodes.reduce((sum: number, node) => sum + (asNumber(asObject(node)?.stargazerCount) ?? 0), 0);
  const total = asNumber(repositories.totalCount) ?? nodes.length;

  return {
    stars,
    followers: count("followers"),
    following: count("following"),
    starsAreExact: total <= nodes.length,
  };
}

/**
 * An item with no author (deleted account) is dropped — a row whose origin is
 * unknown has nothing to say.
 */
function parseItem(node: unknown, kind: ItemKind): Item | null {
  const object = asObject(node);
  if (object === null) return null;

  const number = asNumber(object.number);
  const title = asString(object.title);
  const url = asString(object.url);
  const createdAt = validIso(object.createdAt);
  const repository = asString(asObject(object.repository)?.nameWithOwner);
  const authorObject = asObject(object.author);
  const authorLogin = asString(authorObject?.login);

  if (
    number === null ||
    title === null ||
    url === null ||
    createdAt === null ||
    repository === null ||
    authorLogin === null
  ) {
    return null;
  }

  // GitHub reports bots two ways: `__typename` "Bot", or a login ending in
  // "[bot]". Both have to be caught.
  const authorIsBot = asString(authorObject?.__typename) === "Bot" || authorLogin.endsWith("[bot]");

  return {
    kind,
    repository,
    number,
    title,
    url,
    createdAt,
    isDraft: object.isDraft === true,
    authorLogin,
    authorIsBot,
  };
}

/**
 * More forgiving than `parseSnapshot`: this screen is a convenience, not a
 * data source. If repositories are missing the list is simply empty and the
 * user types names by hand, which beats refusing to open the screen at all.
 */
export function parseCatalog(payload: unknown): Catalog {
  const root = asObject(payload);
  if (root === null) {
    throw new ParseError("malformed", "root is not an object");
  }

  const errors = asArray(root.errors);
  if (errors.length > 0) {
    const message = asString(asObject(errors[0])?.message);
    if (message !== null) {
      throw new ParseError("graphQL", message);
    }
  }

  const viewer = asObject(asObject(root.data)?.viewer);
  const login = asString(viewer?.login);
  if (viewer === null || login === null) {
    throw new ParseError("malformed", "missing viewer");
  }

  const organizations = asArray(asObject(viewer.organizations)?.nodes)
    .map((node) => asString(asObject(node)?.login))
    .filter((value): value is string => value !== null);

  const repositories = asArray(asObject(viewer.repositories)?.nodes)
    .map((node) => {
      const object = asObject(node);
      const nameWithOwner = asString(object?.nameWithOwner);
      if (nameWithOwner === null) return null;
      return { nameWithOwner, isPrivate: object?.isPrivate === true };
    })
    .filter((value): value is CatalogRepository => value !== null);

  return { login, organizations, repositories };
}
