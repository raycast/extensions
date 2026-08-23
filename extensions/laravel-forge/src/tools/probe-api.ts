import { getCollection, getResource } from "../lib/forge";
import { unwrapToken } from "../lib/auth";

type Input = {
  /**
   * A Forge API path without a leading slash, for example `sites?filter[name]=example.com` or
   * `servers/<id>/events`. A path starting with `servers` is scoped to your org for you.
   */
  path: string;
  /**
   * Set when the path returns one resource rather than a list.
   */
  single?: boolean;
};

const orgSlugs = async (token: string) => {
  const { items } = await getCollection("orgs", token, { pages: 1 });
  return items.map((org) => String(org.attributes?.slug ?? "")).filter(Boolean);
};

const CAP = 6_000;

// A site's deployment_url embeds a token that triggers a deploy without any auth
const SECRETS = /token|secret|password|deployment_url|private_key/i;

// Key-name redaction cannot see secrets inside a content string, and these return them
const FORBIDDEN = /(^|\/)(environment|credentials|server-credentials)(\/|\?|$)/;

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, SECRETS.test(key) ? "[redacted]" : redact(nested)]),
    );
  }
  return value;
};

// The whole result is fed to the model, and one page of anything can run past its context
const fitting = <T>(items: T[]) => {
  let kept = items;
  while (kept.length > 1 && JSON.stringify(kept).length > CAP) kept = kept.slice(0, Math.floor(kept.length / 2));
  return kept;
};

// Forge has no top-level /servers; server paths only exist under an org
const scoped = async (path: string, token: string) =>
  /^servers(\/|\?|$)/.test(path) ? (await orgSlugs(token)).map((slug) => `orgs/${slug}/${path}`) : [path];

export default async function tool({ path, single }: Input) {
  const clean = path.trim().replace(/^\/*(api\/)?/, "");
  if (/^[a-z]+:\/\//i.test(clean)) throw new Error("Pass a path relative to the Forge API, not a full URL.");
  if (FORBIDDEN.test(clean)) {
    throw new Error(
      `"${clean}" returns credentials in full and is not readable through this tool. Read it in the Forge UI.`,
    );
  }

  const token = unwrapToken("laravel_forge_api_token");
  if (!token) throw new Error("No Laravel Forge API token is configured.");

  const paths = await scoped(clean, token);

  try {
    if (single) {
      const data = await getResource(paths[0], token);
      const json = JSON.stringify(redact(data ?? null));
      return json.length <= CAP
        ? { path: paths[0], data: redact(data ?? null) }
        : { path: paths[0], truncated: json.slice(0, CAP) };
    }

    const pages = await Promise.all(paths.map((one) => getCollection(one, token, { pages: 1 })));
    const items = pages.flatMap((page) => page.items);
    const included = pages.flatMap((page) => page.included);
    const shown = fitting(items.map(redact));
    return {
      paths,
      onPage: items.length,
      shown: shown.length,
      morePages: pages.some((page) => page.nextCursor),
      items: shown,
      includedTypes: [...new Set(included.map((resource) => resource.type))],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shapes =
      "Paths that work: orgs, orgs/<slug>/servers, orgs/<slug>/servers/<id>, sites?filter[name]=<name>, orgs/<slug>/servers/<id>/sites/<id>/deployments, orgs/<slug>/servers/<id>/events.";
    if (/\b405\b/.test(message)) {
      throw new Error(
        `Forge does not allow GET on "${paths[0]}". A single site is readable at orgs/<slug>/sites/<id>, or through the collection sites?filter[name]=<name>. ${shapes}`,
      );
    }
    if (/^401\b|\b401 /.test(message)) {
      throw new Error(
        `Forge answered 401 for "${paths.join(", ")}". It answers 401 for a path that is not a real route as well as for a bad token. ${shapes}`,
      );
    }
    throw new Error(`${message} ${shapes}`);
  }
}
