import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export type RepoConfig = {
  ghPath: string;
  owner: string;
  name: string;
  branch?: string;
};

export type GhErrorKind =
  | "missing"
  | "unauthenticated"
  | "expired"
  | "sso"
  | "not-found"
  | "gone"
  | "no-queue"
  | "offline"
  | "rate-limited"
  | "forbidden"
  | "other";

export class GhError extends Error {
  constructor(
    message: string,
    readonly kind: GhErrorKind = "other",
    readonly details: { repo?: string; branch?: string; url?: string } = {},
  ) {
    super(message);
  }
}

const ERROR_PATTERNS: [GhErrorKind, RegExp][] = [
  ["sso", /SAML enforcement|single sign-on|\bSSO\b/i],
  ["expired", /bad credentials|HTTP 401|token (has )?(expired|been revoked)/i],
  ["unauthenticated", /gh auth login|not logged in|authentication required/i],
  ["rate-limited", /rate limit/i],
  ["not-found", /Could not resolve to a Repository|HTTP 404/i],
  ["gone", /HTTP 410/i],
  ["forbidden", /HTTP 403|Resource not accessible|must have (admin|write)/i],
  [
    "offline",
    /error connecting to|dial tcp|no such host|i\/o timeout|network is unreachable|connection (refused|reset)|TLS handshake timeout|context deadline exceeded/i,
  ],
];

export function classifyGhMessage(message: string): GhErrorKind {
  return ERROR_PATTERNS.find(([, pattern]) => pattern.test(message))?.[0] ?? "other";
}

export function ssoUrl(message: string): string | undefined {
  return /https:\/\/github\.com\/(?:orgs|enterprises)\/[^\s)"']+\/sso[^\s)"']*/.exec(message)?.[0];
}

const GH_CANDIDATES = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"];

export function findGh(preferred?: string, candidates: string[] = GH_CANDIDATES): string | undefined {
  return (preferred ? [preferred, ...candidates] : candidates).find((path) => existsSync(path));
}

export function repoSlug(config: Pick<RepoConfig, "owner" | "name">): string {
  return `${config.owner}/${config.name}`;
}

export function parseRepository(value: string): { owner: string; name: string } {
  const slug = value
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const [owner, name, ...rest] = slug.split("/");
  if (!owner || !name || rest.length > 0) {
    throw new GhError(`Repository must look like owner/name, got "${value}"`);
  }
  return { owner, name };
}

const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

export function gh(config: Pick<RepoConfig, "ghPath">, args: string[]): Promise<string> {
  const path = [dirname(config.ghPath), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(":");
  return new Promise((resolve, reject) => {
    execFile(
      config.ghPath,
      args,
      {
        maxBuffer: MAX_OUTPUT_BYTES,
        env: { ...process.env, PATH: path, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", NO_COLOR: "1" },
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new GhError(`GitHub CLI not found at ${config.ghPath}`, "missing"));
          return;
        }
        const message = stderr.trim().replace(/^gh: /, "") || error.message;
        reject(
          new GhError(message.length > 400 ? `${message.slice(0, 400)}…` : message, classifyGhMessage(message), {
            url: ssoUrl(message),
          }),
        );
      },
    );
  });
}

export async function graphql<T>(
  config: Pick<RepoConfig, "ghPath">,
  query: string,
  variables: Record<string, string | number | undefined>,
): Promise<T> {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      args.push(typeof value === "number" ? "-F" : "-f", `${key}=${value}`);
    }
  }
  const response = JSON.parse(await gh(config, args)) as { data?: T; errors?: { message: string }[] };
  if (response.errors?.length) {
    throw new GhError(response.errors.map((error) => error.message).join("; "));
  }
  if (!response.data) {
    throw new GhError("GitHub returned no data");
  }
  return response.data;
}

export async function rest<T>(config: Pick<RepoConfig, "ghPath">, path: string): Promise<T> {
  return JSON.parse(await gh(config, ["api", path])) as T;
}

export function errorKind(error: unknown): GhErrorKind {
  return error instanceof GhError ? error.kind : "other";
}

const SIGN_IN = "gh auth login --hostname github.com --git-protocol https --web --clipboard";

export function setupCommand(error: unknown): string | undefined {
  switch (errorKind(error)) {
    case "missing":
      return `brew install gh && ${SIGN_IN}`;
    case "unauthenticated":
    case "expired":
      return SIGN_IN;
    case "sso":
      return "gh auth refresh --hostname github.com";
    case "not-found":
      return "gh auth status";
    default:
      return undefined;
  }
}

export function needsSignIn(error: unknown): boolean {
  return ["missing", "unauthenticated", "expired", "sso"].includes(errorKind(error));
}
