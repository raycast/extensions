import { Color, getPreferenceValues, Icon, Image } from "@raycast/api";
import { gitHubPullRequestUrl, graphitePullRequestUrl, InboxErrorKind, PullRequest } from "./api";

export type PullRequestLinks = { graphite: string; github: string; primary: string; primaryName: string };

export function pullRequestLinks(appUrl: string, owner: string, repo: string, number: number): PullRequestLinks {
  const { openPullRequestsIn } = getPreferenceValues<Preferences>();
  const graphite = graphitePullRequestUrl(appUrl, owner, repo, number);
  const github = gitHubPullRequestUrl(owner, repo, number);
  return openPullRequestsIn === "github"
    ? { graphite, github, primary: github, primaryName: "GitHub" }
    : { graphite, github, primary: graphite, primaryName: "Graphite" };
}

export function authorIcon(pr: PullRequest): Image.ImageLike {
  return pr.author ? { source: pr.author.avatarUrl, mask: Image.Mask.Circle } : Icon.PersonCircle;
}

export function pullRequestStatusTag(
  state: string | undefined,
  isDraft?: boolean,
): { value: string; color: Color; icon: Icon } {
  if (state === "MERGED") return { value: "Merged", color: Color.Purple, icon: Icon.CheckCircle };
  if (state === "CLOSED") return { value: "Closed", color: Color.Red, icon: Icon.XMarkCircle };
  if (isDraft) return { value: "Draft", color: Color.SecondaryText, icon: Icon.CircleEllipsis };
  return { value: "Open", color: Color.Green, icon: Icon.Circle };
}

/** Mergeability as reported by the CLI, e.g. `NEEDS_CODEOWNER_APPROVALS` → "Needs codeowner approvals". */
export function humanize(value: string): string {
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const inboxErrorTitles: Record<InboxErrorKind, string> = {
  NOT_SET_UP: "Set Up the Graphite CLI",
  SIGNED_OUT: "Sign In to Graphite",
  OFFLINE: "Can't Reach Graphite",
  UNEXPECTED: "Couldn't Load Your Inbox",
};

export const GRAPHITE_CLI_AUTH_URL = "https://app.graphite.com/activate";
export const GRAPHITE_CLI_INSTALL_URL = "https://graphite.com/docs/install-the-cli";

export function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
