import { errorKind, GhError, GhErrorKind, setupCommand } from "./gh";

export const MERGE_QUEUE_DOCS =
  "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue";

export type ErrorAdvice = {
  kind: GhErrorKind;
  title: string;
  description: string;
  command?: string;
  url?: string;
  canSwitch: boolean;
};

function details(error: unknown): { repo?: string; branch?: string; url?: string } {
  return error instanceof GhError ? error.details : {};
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function describeError(error: unknown): ErrorAdvice {
  const kind = errorKind(error);
  const { repo, branch, url } = details(error);
  const command = setupCommand(error);
  switch (kind) {
    case "missing":
      return {
        kind,
        command,
        canSwitch: false,
        title: "GitHub CLI isn't installed",
        description:
          "Merge Queue reads GitHub through the gh command. Install it and sign in from Terminal (↵), then come back. It retries on its own.",
      };
    case "unauthenticated":
      return {
        kind,
        command,
        canSwitch: false,
        title: "Sign in to the GitHub CLI",
        description:
          "gh isn't signed in. Sign in from Terminal (↵): it copies a code and opens GitHub in your browser. Merge Queue retries on its own.",
      };
    case "expired":
      return {
        kind,
        command,
        canSwitch: false,
        title: "GitHub CLI sign-in expired",
        description:
          "GitHub no longer accepts gh's token; it expired or was revoked. Sign in again from Terminal (↵). Merge Queue retries on its own.",
      };
    case "sso":
      return {
        kind,
        command,
        url,
        canSwitch: false,
        title: repo ? `Authorize gh for ${repo.split("/")[0]}'s single sign-on` : "Authorize gh for single sign-on",
        description: url
          ? "This organization uses SAML single sign-on, and gh's token isn't authorized for it yet. Authorize it on GitHub (↵), then come back."
          : "This organization uses SAML single sign-on, and gh's token isn't authorized for it yet. Refresh gh's sign-in from Terminal (↵) and authorize the organization in your browser.",
      };
    case "not-found":
      return {
        kind,
        command,
        canSwitch: true,
        title: repo ? `Can't see ${repo}` : "Not found on GitHub",
        description:
          "It doesn't exist, or the account gh is signed in to can't see it. gh auth status shows which account that is, and gh auth switch changes it.",
      };
    case "no-queue":
      return {
        kind,
        canSwitch: true,
        title: repo ? `${repo} has no merge queue` : "No merge queue",
        description: `GitHub reports no merge queue${branch ? ` on ${branch}` : ""}. Choose another repository, or enter the branch the queue is on.`,
      };
    case "offline":
      return {
        kind,
        canSwitch: false,
        title: "Can't reach GitHub",
        description: "Check your internet connection. It tries again on the next refresh.",
      };
    case "rate-limited":
      return {
        kind,
        canSwitch: false,
        title: "GitHub rate limit reached",
        description: "Too many requests for now. It recovers on its own, usually within the hour.",
      };
    case "forbidden":
      return {
        kind,
        canSwitch: false,
        title: "Not allowed",
        description: "Your GitHub account doesn't have permission for this. Rerunning jobs needs write access.",
      };
    case "gone":
      return {
        kind,
        canSwitch: false,
        title: "No longer available",
        description: "GitHub has deleted it, usually because it's past the repository's log retention period.",
      };
    default:
      return { kind, canSwitch: false, title: "Something went wrong", description: message(error) };
  }
}

export function logErrorMessage(error: unknown): string {
  const advice = describeError(error);
  if (advice.kind === "gone" || advice.kind === "not-found") {
    return "The log isn't available anymore. GitHub deletes logs after the repository's retention period.";
  }
  return advice.kind === "other" ? advice.description : `${advice.title}. ${advice.description}`;
}
