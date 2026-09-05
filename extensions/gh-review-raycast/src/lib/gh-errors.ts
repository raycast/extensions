/**
 * Turns GitHub's raw failures into something a human can act on.
 *
 * The failure this exists for is SAML: GitHub answers a perfectly valid token
 * with "Resource protected by organization SAML enforcement", the affected
 * org's pull requests silently vanish, and the token isn't even listed on the
 * /settings/tokens page — because a `gh auth login` token is an OAuth app
 * grant, not a PAT. Left raw, that reads as a broken extension.
 *
 * Pure and dependency-free so the classification can be tested directly.
 */

export type FailureKind =
  /** A SAML org needs this credential authorized before it will answer. */
  | "saml"
  /** The token works but lacks a scope the request needed. */
  | "scopes"
  /** The token is invalid, expired, or revoked. */
  | "unauthorized"
  /** GitHub is throttling us. */
  | "rate-limit"
  /** Couldn't reach GitHub at all. */
  | "network"
  /** Anything unrecognized — shown verbatim rather than guessed at. */
  | "unknown";

export type Failure = {
  kind: FailureKind;
  /** One line naming the problem, in the user's terms. */
  title: string;
  /** Why it happened and what it means for what they're seeing. */
  explanation: string;
  /** A shell command that fixes it, or "" when there isn't one. */
  fix: string;
  /** Orgs named by the failure, when GitHub tells us. */
  orgs: string[];
  /** A direct authorize URL, when GitHub hands one back in a header. */
  ssoUrl?: string;
};

const AUTHORIZED_APPS_URL = "https://github.com/settings/apps/authorizations";

/**
 * Creating a classic PAT with the scopes this extension needs, pre-selected.
 *
 * This is the escape hatch when an organization restricts third-party OAuth
 * apps and no owner will approve the GitHub CLI: those restrictions govern
 * OAuth *apps*, and a classic PAT isn't one, so authorizing it for the org is
 * self-service. (Fine-grained tokens don't help here — those *are* subject to
 * org approval.)
 */
export const NEW_PAT_URL =
  "https://github.com/settings/tokens/new?scopes=repo,read:org&description=GH+Review+for+Raycast";

/**
 * GitHub returns the org's SSO authorize URL in an `X-GitHub-SSO` header:
 *
 *     X-GitHub-SSO: required; url=https://github.com/orgs/acme/sso?authorization_request=ABC
 *
 * Some responses use the shorter `required; <id>` form with no URL.
 */
export function parseSsoHeader(header: string | null | undefined): { url?: string; org?: string } {
  if (!header) return {};
  const url = /url=(\S+)/.exec(header)?.[1];
  if (!url) return {};
  const org = /\/orgs\/([^/]+)\//.exec(url)?.[1];
  return { url, org };
}

/** Pulls org logins out of a message like `organization 'acme'` or `org:acme`. */
function orgsInMessage(message: string): string[] {
  const found = new Set<string>();
  for (const re of [/organization[s]?\s+['"`]([\w.-]+)['"`]/gi, /\borg:([\w.-]+)/gi]) {
    for (const match of message.matchAll(re)) found.add(match[1]);
  }
  return [...found];
}

/**
 * Classifies a failure message into something actionable. `ssoHeader` is the
 * `X-GitHub-SSO` response header when one was present.
 */
export function classifyFailure(message: string, ssoHeader?: string | null): Failure {
  const text = message.toLowerCase();
  const sso = parseSsoHeader(ssoHeader);
  const orgs = [...new Set([...orgsInMessage(message), ...(sso.org ? [sso.org] : [])])];

  const isSaml =
    Boolean(sso.url) ||
    text.includes("saml enforcement") ||
    text.includes("single sign-on") ||
    text.includes("single sign on") ||
    text.includes("grant your oauth token access") ||
    text.includes("sso");

  if (isSaml) {
    const who = orgs.length > 0 ? orgs.map((o) => `“${o}”`).join(", ") : "one of your organizations";
    return {
      kind: "saml",
      title: "Your organization needs to authorize this token",
      explanation:
        `${who} enforces SAML single sign-on. Your login is fine — the token just hasn't been granted ` +
        `access to that organization yet, so GitHub returns its pull requests as empty rather than as an error. ` +
        `This is the most common reason the extension looks broken when it isn't.\n\n` +
        `**You can almost certainly fix this yourself.** Signing in through your company's identity provider ` +
        `is a per-user action — no administrator involved. An owner is only needed in one case: if the ` +
        `organization restricts third-party OAuth apps *and* nobody has approved the GitHub CLI yet. You'll ` +
        `know, because the button will say **Request** instead of **Grant**.`,
      fix: "gh auth login --web",
      orgs,
      ssoUrl: sso.url,
    };
  }

  if (
    text.includes("scope") &&
    (text.includes("insufficient") || text.includes("requires") || text.includes("not been granted"))
  ) {
    const scope = /\b(read:org|repo|read:user|workflow|gist)\b/.exec(message)?.[1];
    return {
      kind: "scopes",
      title: scope ? `Token is missing the \`${scope}\` scope` : "Token is missing a required scope",
      explanation:
        "The token authenticated fine but isn't allowed to read what this view needs. Adding the scope " +
        "re-uses your existing login — it won't sign you out.",
      fix: `gh auth refresh -s ${scope ?? "repo,read:org"}`,
      orgs,
    };
  }

  if (text.includes("bad credentials") || text.includes("401") || text.includes("invalid or expired")) {
    return {
      kind: "unauthorized",
      title: "GitHub rejected the token",
      explanation:
        "The token was revoked, or the account's password changed. GitHub also retires OAuth tokens after a " +
        "full year without use. Signing in again issues a fresh one.",
      fix: "gh auth login --web",
      orgs,
    };
  }

  if (text.includes("rate limit") || text.includes("429")) {
    return {
      kind: "rate-limit",
      title: "GitHub is rate-limiting these requests",
      explanation:
        "Nothing is broken — GitHub is asking us to slow down. It clears on its own; lowering " +
        "“Max Results per Category” in preferences makes it less likely to recur.",
      fix: "",
      orgs,
    };
  }

  if (
    text.includes("enotfound") ||
    text.includes("econnrefused") ||
    text.includes("etimedout") ||
    text.includes("network") ||
    text.includes("fetch failed")
  ) {
    return {
      kind: "network",
      title: "Couldn't reach GitHub",
      explanation: "The request never landed. Usually a dropped connection, a VPN, or a proxy.",
      fix: "gh api graphql -f query='{ viewer { login } }'",
      orgs,
    };
  }

  return {
    kind: "unknown",
    title: "GitHub returned an error",
    explanation:
      "The full response is below. If it mentions an organization, it's usually the SAML authorization step.",
    fix: "",
    orgs,
  };
}

/**
 * The steps for switching to a classic PAT, for when OAuth app approval is
 * blocked. Note it goes through the keyring, never a shell profile — Raycast
 * is launched by launchd and never sources `~/.zshrc`, so `GH_TOKEN` exported
 * there is visible to your terminal and invisible to this extension.
 */
export const PAT_FALLBACK_STEPS = [
  `1. Create a classic token with \`repo\` and \`read:org\`: ${NEW_PAT_URL}`,
  "2. Click **Configure SSO → Authorize** next to your organization — self-service, no owner needed",
  "3. Hand it to the CLI so it lands in your keychain:",
  "",
  "```sh",
  "gh auth login --with-token < /path/to/token.txt",
  "```",
  "",
  "   …or run `gh auth login` and choose *Paste an authentication token*.",
  "",
  "Do **not** put it in `~/.zshrc` as `GH_TOKEN`. Raycast is launched by launchd and never reads your shell profile, so it would work in your terminal and fail here.",
].join("\n");

/** The page an organization owner uses to approve third-party OAuth apps. */
export function orgPolicyUrl(org: string): string {
  return `https://github.com/organizations/${org}/settings/oauth_application_policy`;
}

/**
 * A ready-to-send message asking an owner to approve the GitHub CLI.
 *
 * Needing an admin is only half the problem — the other half is having to
 * explain to them what you're asking for and why it's safe. This says it, with
 * the link, so it can be pasted into Slack unedited.
 */
export function ownerApprovalRequest(org?: string): string {
  const name = org ?? "our organization";
  return [
    `Hi! Could you approve the **GitHub CLI** OAuth app for the \`${name}\` organization?`,
    "",
    "It's GitHub's own official CLI (https://github.com/cli/cli). I'm using it with a",
    "Raycast extension that shows me the pull requests waiting on my review, so I stop",
    "missing review requests.",
    "",
    "It acts strictly as me — it can't see anything I can't already see, and it only",
    "reads pull requests and posts comments under my own account.",
    "",
    org
      ? `Approve here: ${orgPolicyUrl(org)}`
      : "Approve under: Organization Settings → Third-party Access → OAuth app policy",
    "",
    "Thanks!",
  ].join("\n");
}

/** Where to send someone to fix a failure, most specific link first. */
export function failureLinks(failure: Failure): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  if (failure.ssoUrl) {
    links.push({ label: `Authorize ${failure.orgs[0] ?? "the organization"} now`, url: failure.ssoUrl });
  }
  if (failure.kind === "saml") {
    links.push({ label: "Authorized OAuth Apps", url: AUTHORIZED_APPS_URL });
    for (const org of failure.orgs) {
      links.push({ label: `${org} SSO settings`, url: `https://github.com/orgs/${org}/sso` });
      // Only useful if you're an owner, but harmless otherwise — members get a
      // read-only view telling them to request access.
      links.push({ label: `${org} OAuth app policy (owners)`, url: orgPolicyUrl(org) });
    }
  }
  return links;
}
