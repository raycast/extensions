// The numbers behind a card, for Raycast AI: glancecard's own models, cut to what answers questions.
import type { StarHistory } from "glancecard";
import { isStale, keptCard, profileOf, readCard, repoOf, type Card, type Target } from "./cards";

/** The kept card while it is fresh, a new read otherwise. */
export async function freshCard(target: Target): Promise<Card> {
  const kept = keptCard(target);
  return kept && !isStale(kept) ? kept : readCard(target);
}

const starsOf = (s: StarHistory | null) =>
  s && {
    total: s.total,
    last30Days: s.last30,
    lastYear: s.lastYear,
    bestWeek: s.best && { weekOf: s.best.day, stars: s.best.count },
    firstStar: s.first,
  };

export function profileStats(card: Card) {
  const m = profileOf(card);
  return {
    login: m.user.login,
    name: m.user.name,
    bio: m.user.bio,
    company: m.user.company,
    location: m.user.location,
    onGitHubSince: m.joinedYear,
    followers: m.user.followers.totalCount,
    following: m.user.following.totalCount,
    publicRepositories: m.repoCount,
    starsAcrossPublicRepositories: m.stars,
    forksOfPublicRepositories: m.forks,
    contributionsLastYear: m.calendar.totalContributions,
    commitsLastYear: m.commits,
    repositoriesContributedToLastYear: m.contributedRepos,
    pullRequests: m.counts.prs,
    mergedPullRequests: m.counts.merged,
    issuesOpened: m.counts.issues,
    mostStarred: m.topRepos.map((r) => ({
      name: r.name,
      stars: r.stargazerCount,
      language: r.primaryLanguage?.name ?? null,
    })),
    languagesByRepositories: m.languages.map((l) => ({ language: l.name, repositories: l.count })),
    starHistory: starsOf(m.starHistory),
    readAt: card.data.fetchedAt,
    url: `https://github.com/${m.user.login}`,
  };
}

export function repositoryStats(card: Card) {
  const m = repoOf(card);
  const r = m.repo;
  return {
    repository: r.nameWithOwner,
    description: r.description,
    homepage: r.homepageUrl,
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    archived: r.isArchived,
    createdAt: r.createdAt,
    lastPushAt: r.pushedAt,
    daysSinceLastPush: m.idleDays,
    latestTag: m.latestTag,
    stars: r.stargazerCount,
    forks: r.forkCount,
    watchers: r.watchers.totalCount,
    openIssues: r.openIssues.totalCount,
    closedIssues: r.closedIssues.totalCount,
    openPullRequests: r.openPRs.totalCount,
    mergedPullRequests: r.mergedPRs.totalCount,
    license: r.licenseInfo?.spdxId ?? null,
    totalCommits: m.totalCommits,
    commitsLast30Days: m.last30,
    commitsLastYear: m.yearCommits,
    commitsLastYearIsCapped: m.capped,
    activeDaysLastYear: m.activeDays,
    currentStreakDays: m.streak,
    longestStreakDaysLastYear: m.longest,
    busiestWeekday: m.busiestDay,
    peakHour: m.peakHour,
    languages: m.languages.map((l) => ({ language: l.name, share: `${Math.round(l.share * 100)}%` })),
    essentials: Object.fromEntries(m.essentials.map((e) => [e.label, e.ok])),
    releases: m.releaseCount,
    latestReleases: m.releases.map((x) => ({ tag: x.tagName, on: x.day })),
    releaseDownloads: m.downloads,
    contributors: m.contributorCount,
    latestCommits: m.commits.map((c) => ({
      sha: c.abbreviatedOid,
      message: c.messageHeadline,
      on: c.day,
      author: c.author.name,
    })),
    starHistory: starsOf(m.stars),
    readAt: card.data.fetchedAt,
    url: `https://github.com/${r.nameWithOwner}`,
  };
}
