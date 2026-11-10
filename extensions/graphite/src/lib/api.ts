import { z } from "zod";
import { shellVariable } from "./cli";
import {
  GraphiteConfig,
  GraphiteConfigInvalidError,
  GraphiteConfigMissingError,
  readGraphiteConfig,
} from "./graphite-config";

/**
 * Graphite has no public API. These are the same endpoints the Graphite menu bar app and the `gt` CLI call,
 * authenticated with the token that `gt auth` stores. Treat the shapes as unstable and parse defensively.
 */

/** Raycast's built-in confetti, shown after merges when "Celebrate merges" is on. */
export const CONFETTI_URL = "raycast://extensions/raycast/raycast/confetti";

const USER_AGENT = "raycast-graphite-extension/1.0.0";
// The server caps every section at 20 pull requests, whatever `first` asks for.
const PRS_PER_SECTION = 20;

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  repo: z.object({ name: z.string(), owner: z.string() }),
  author: z
    .object({
      name: z.string().nullable().catch(null),
      login: z.string(),
      avatarUrl: z.string().nullable().optional(),
    })
    .transform((author) => ({ ...author, avatarUrl: author.avatarUrl ?? `https://github.com/${author.login}.png` }))
    .nullable(),
  reviewDecision: z.string().nullable().optional().catch(null),
});

const sectionSchema = z
  .object({
    name: z.string(),
    sectionId: z.string(),
    includeInTotalCount: z.boolean().catch(false),
    totalUnpaginatedPrs: z.number().optional(),
    prs: z.array(z.unknown()).transform((items) =>
      items.flatMap((item) => {
        const parsed = pullRequestSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  })
  .transform((section) => ({ ...section, totalUnpaginatedPrs: section.totalUnpaginatedPrs ?? section.prs.length }));

export type PullRequest = z.output<typeof pullRequestSchema>;
export type InboxSection = z.output<typeof sectionSchema>;

/** Preserve valid sections and pull requests when individual items drift from the undocumented API schema. */
export function parseSectionsSummary(body: unknown): InboxSection[] | undefined {
  const parsed = z.object({ sections: z.array(z.unknown()) }).safeParse(body);
  if (!parsed.success) return undefined;
  const sections = parsed.data.sections.flatMap((section) => {
    const result = sectionSchema.safeParse(section);
    return result.success ? [result.data] : [];
  });
  // Dropping a few malformed items is fine; dropping all of them means the API changed, which must not look like
  // an empty inbox.
  const rawPullRequestCount = parsed.data.sections.reduce<number>((total, section) => {
    const prs = z.object({ prs: z.array(z.unknown()) }).safeParse(section);
    return total + (prs.success ? prs.data.prs.length : 0);
  }, 0);
  const validPullRequestCount = sections.reduce((total, section) => total + section.prs.length, 0);
  if (parsed.data.sections.length > 0 && sections.length === 0) return undefined;
  if (rawPullRequestCount > 0 && validPullRequestCount === 0) return undefined;
  return sections;
}

export type InboxErrorKind = "NOT_SET_UP" | "SIGNED_OUT" | "OFFLINE" | "UNEXPECTED";

export class InboxError extends Error {
  constructor(
    readonly kind: InboxErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "InboxError";
  }
}

export type Inbox = { sections: InboxSection[]; appUrl: string };

const TLS_ERROR_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);
const NETWORK_ERROR_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"]);

/** Classify transport failures without exposing raw errors or misreporting certificate failures as offline. */
export function classifyRequestError(error: unknown): InboxError {
  if (error instanceof InboxError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new InboxError("OFFLINE", "Graphite didn't respond in time. Check your connection and try again.");
  }
  const cause = typeof error === "object" && error !== null && "cause" in error ? error.cause : undefined;
  const codes = [
    typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined,
  ];
  if (codes.some((code) => typeof code === "string" && TLS_ERROR_CODES.has(code))) {
    return new InboxError(
      "UNEXPECTED",
      "Couldn't make a secure connection to Graphite. If you're behind a proxy, check its certificate settings.",
    );
  }
  if (
    (error instanceof Error && error.message === "fetch failed") ||
    codes.some((code) => typeof code === "string" && NETWORK_ERROR_CODES.has(code))
  ) {
    return new InboxError("OFFLINE", "Could not reach Graphite. Check your internet connection.");
  }
  return new InboxError("UNEXPECTED", "Request to Graphite failed. Try again in a moment.");
}

/**
 * Raycast doesn't inherit `XDG_CONFIG_HOME` from the user's shell. Only when the config isn't in the usual places,
 * ask the login shell where it lives, so the common case never pays for a shell probe.
 */
async function readGraphiteConfigWithShellFallback(): Promise<GraphiteConfig> {
  try {
    return await readGraphiteConfig();
  } catch (error) {
    if (!(error instanceof GraphiteConfigMissingError)) throw error;
    const shellConfigHome = await shellVariable("XDG_CONFIG_HOME").catch(() => undefined);
    if (!shellConfigHome || shellConfigHome === process.env.XDG_CONFIG_HOME) throw error;
    return readGraphiteConfig(shellConfigHome);
  }
}

async function loadConfig(): Promise<GraphiteConfig & { authToken: string }> {
  let config: GraphiteConfig;
  try {
    config = await readGraphiteConfigWithShellFallback();
  } catch (error) {
    if (error instanceof GraphiteConfigMissingError || error instanceof GraphiteConfigInvalidError) {
      throw new InboxError("NOT_SET_UP", error.message);
    }
    throw new InboxError("UNEXPECTED", "Could not read the Graphite CLI config.");
  }
  if (!config.authToken) {
    throw new InboxError("SIGNED_OUT", "The Graphite CLI is not signed in. Run `gt auth --token <token>`.");
  }
  return { ...config, authToken: config.authToken };
}

/** The Graphite web app's URL from the CLI config, for building links without loading the inbox. */
export async function graphiteAppUrl(): Promise<string> {
  return (await loadConfig()).appUrl;
}

async function graphiteRequest(
  path: string,
  init: { method: "GET" } | { method: "POST"; body: unknown },
): Promise<{ response: Response; config: GraphiteConfig }> {
  const config = await loadConfig();
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method: init.method,
      headers: {
        authorization: `token ${config.authToken}`,
        "User-Agent": USER_AGENT,
        ...(init.method === "POST" ? { "content-type": "application/json" } : {}),
      },
      body: init.method === "POST" ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw classifyRequestError(error);
  }
  if (response.status === 401 || response.status === 403) {
    throw new InboxError("SIGNED_OUT", "Graphite rejected the CLI auth token. Run `gt auth` again.");
  }
  return { response, config };
}

async function readJson(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw classifyRequestError(error);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchInbox(): Promise<Inbox> {
  const { response, config } = await graphiteRequest(`/graphite/sections-summary?first=${PRS_PER_SECTION}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new InboxError("UNEXPECTED", `Graphite responded with ${response.status} ${response.statusText}`);
  }
  const sections = parseSectionsSummary(await readJson(response));
  if (sections === undefined) {
    throw new InboxError("UNEXPECTED", "Graphite returned an unexpected response. The internal API may have changed.");
  }
  return { sections, appUrl: config.appUrl };
}

/**
 * Graphite's verdict on whether a PR can merge, e.g. `READY_TO_MERGE`, `NEEDS_APPROVALS`, `FAILING_REQUIRED`,
 * `UNRESOLVED_COMMENTS`. The same check `gt merge` runs.
 */
export async function fetchMergeability(
  owner: string,
  repo: string,
  numbers: number[],
): Promise<Record<number, string>> {
  if (numbers.length === 0) return {};
  const { response } = await graphiteRequest("/graphite/mergeability-status", {
    method: "POST",
    body: { repoOwner: owner, repoName: repo, prNumbers: numbers },
  });
  if (!response.ok) return {};
  const parsed = z
    .object({ mergeabilityStatuses: z.array(z.object({ prNumber: z.number(), mergeabilityStatus: z.string() })) })
    .safeParse(await readJson(response));
  if (!parsed.success) return {};
  return Object.fromEntries(parsed.data.mergeabilityStatuses.map((s) => [s.prNumber, s.mergeabilityStatus]));
}

/**
 * Asks Graphite to merge PRs, bottom of the stack first, exactly like `gt merge` does.
 * Graphite merges in the background (and through its merge queue when the repository has one).
 */
export async function mergeWithGraphite(
  owner: string,
  repo: string,
  trunk: string,
  prNumbers: number[],
): Promise<void> {
  const { response } = await graphiteRequest("/graphite/merge", {
    method: "POST",
    body: { repoOwner: owner, repoName: repo, trunkBranchName: trunk, prNumbers },
  });
  if (!response.ok) {
    const body = await readJson(response);
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Graphite could not merge (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export function graphitePullRequestUrl(appUrl: string, owner: string, repo: string, number: number): string {
  return `${appUrl}/github/pr/${owner}/${repo}/${number}`;
}

export function gitHubPullRequestUrl(owner: string, repo: string, number: number): string {
  return `https://github.com/${owner}/${repo}/pull/${number}`;
}
