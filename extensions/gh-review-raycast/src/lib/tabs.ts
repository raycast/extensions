/**
 * Builds the ordered list of categories: the built-in ones (scoped to the
 * active orgs) followed by the user's saved filters. Ported from
 * flex-review's internal/tui/tabs.go.
 */
import { Color, Icon } from "@raycast/api";

import type { Config } from "./config";
import { orgActive, orgQualifier, searchString } from "./config";
import type { PullRequest, Viewer } from "./types";
import { nameWithOwner } from "./types";

/**
 * Caps how many teams are OR'd into the team-review query, keeping the GitHub
 * search string within limits.
 */
const MAX_TEAMS_IN_QUERY = 8;

/** A single view: a GitHub search plus an optional client-side post-filter. */
export type Category = {
  id: string;
  title: string;
  icon: Icon;
  color: Color;
  query: string;
  /** Applied after the fetch, for signals GitHub search can't express. */
  post?: (pr: PullRequest) => boolean;
  builtin: boolean;
};

/** Assembles the category list for a config/viewer pair. */
export function buildCategories(config: Config, viewer: Viewer): Category[] {
  const categories: Category[] = [];
  const scope = orgQualifier(config);

  if (config.showBuiltins) {
    categories.push({
      id: "review-requested",
      title: "Needs my review",
      icon: Icon.Eye,
      color: Color.Red,
      query: `is:pr is:open review-requested:@me archived:false${scope}`,
      builtin: true,
    });

    const teamQuery = teamReviewQuery(watchedTeams(config, viewer));
    if (teamQuery) {
      categories.push({
        id: "team-review",
        title: "My team's review",
        icon: Icon.TwoPeople,
        color: Color.Orange,
        query: teamQuery,
        builtin: true,
      });
    }

    categories.push({
      id: "my-prs",
      title: "My open PRs",
      icon: Icon.Person,
      color: Color.Green,
      query: `is:pr is:open author:@me archived:false${scope}`,
      builtin: true,
    });

    categories.push({
      id: "awaiting-reply",
      title: "Awaiting my reply",
      icon: Icon.SpeechBubbleActive,
      color: Color.Blue,
      query: `is:pr is:open involves:@me archived:false${scope}`,
      post: (pr) => pr.awaitingReply > 0,
      builtin: true,
    });

    const reposQuery = watchedReposQuery(watchedRepos(config));
    if (reposQuery) {
      categories.push({
        id: "watching",
        title: "Watching",
        icon: Icon.Binoculars,
        color: Color.Purple,
        query: reposQuery,
        builtin: true,
      });
    }
  }

  for (const filter of config.filters) {
    categories.push({
      id: `filter:${filter.name}`,
      title: filter.name,
      icon: Icon.Bookmark,
      color: Color.Yellow,
      query: searchString(filter, config),
      builtin: false,
    });
  }

  return categories;
}

/**
 * The teams to use for the team-review category: the user's chosen teams in
 * the active orgs, or all of their teams there when none are chosen.
 */
export function watchedTeams(config: Config, viewer: Viewer): string[] {
  const orgs = config.activeOrgs;
  const mine = teamsInOrgs(viewer.teams, orgs);
  const chosen = teamsInOrgs(config.watchTeams, orgs);
  if (chosen.length === 0) return mine;

  // Intersect the chosen teams with the ones the viewer is actually on.
  const set = new Set(mine.map((t) => t.toLowerCase()));
  const out = chosen.filter((t) => set.has(t.toLowerCase()));
  return out.length > 0 ? out : mine;
}

/** Watched repos in the active orgs (all of them when no org is active). */
export function watchedRepos(config: Config): string[] {
  return config.repos.filter((r) => orgActive(config, r.owner)).map(nameWithOwner);
}

/** An OR of repo: qualifiers for open PRs, or "" when nothing is watched. */
function watchedReposQuery(repos: string[]): string {
  if (repos.length === 0) return "";
  return ["is:pr", "is:open", ...repos.map((r) => `repo:${r}`)].join(" ");
}

/**
 * Filters "org/slug" team identifiers to those under any of `orgs`. An empty
 * `orgs` means no scope, so all teams are returned.
 */
function teamsInOrgs(teams: string[], orgs: string[]): string[] {
  if (orgs.length === 0) return teams;
  const prefixes = orgs.map((o) => `${o.toLowerCase()}/`);
  return teams.filter((t) => prefixes.some((p) => t.toLowerCase().startsWith(p)));
}

/** An OR of team-review-requested qualifiers, or "" when the viewer has no teams. */
function teamReviewQuery(teams: string[]): string {
  if (teams.length === 0) return "";
  const capped = teams.slice(0, MAX_TEAMS_IN_QUERY);
  return ["is:pr", "is:open", "archived:false", ...capped.map((t) => `team-review-requested:${t}`)].join(" ");
}
