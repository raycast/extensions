import type { LaunchEntry, Workspace } from "./schema";

export type WorkspaceListItem = {
  workspace: Workspace;
  launch?: LaunchEntry;
  section?: "favorites" | "recent" | "workspaces";
  score: number;
};

type QueryRange = {
  query: string;
  start: number;
  length: number;
};

function getQueryRange(query: string): QueryRange | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  const start = query.indexOf(trimmed);
  return { query, start, length: trimmed.length };
}

function containsText(
  value: string | null | undefined,
  query: string,
  queryStart: number,
  queryLength: number,
): boolean {
  if (!value) {
    return false;
  }
  const needle = query.slice(queryStart, queryStart + queryLength);
  return value.toLowerCase().includes(needle.toLowerCase());
}

function matchesForRootPalette(workspace: Workspace, range: QueryRange): boolean {
  return (
    containsText(workspace.name, range.query, range.start, range.length) ||
    containsText(workspace.directory, range.query, range.start, range.length) ||
    containsText(workspace.wtProfile, range.query, range.start, range.length)
  );
}

function matchesWorkspace(workspace: Workspace, range: QueryRange): boolean {
  if (matchesForRootPalette(workspace, range)) {
    return true;
  }
  if (containsText(workspace.abbreviation, range.query, range.start, range.length)) {
    return true;
  }
  if (containsText(workspace.command, range.query, range.start, range.length)) {
    return true;
  }
  for (const launch of workspace.launches) {
    if (containsText(launch.label, range.query, range.start, range.length)) {
      return true;
    }
    if (containsText(launch.command, range.query, range.start, range.length)) {
      return true;
    }
  }
  return false;
}

function compareAbbreviationMatch(left: Workspace, right: Workspace, range: QueryRange): number {
  const needle = range.query.slice(range.start, range.start + range.length);
  const leftAbbreviation = left.abbreviation ?? "";
  const rightAbbreviation = right.abbreviation ?? "";
  const leftExact = leftAbbreviation.toLowerCase() === needle.toLowerCase();
  const rightExact = rightAbbreviation.toLowerCase() === needle.toLowerCase();
  if (leftExact !== rightExact) {
    return leftExact ? -1 : 1;
  }

  const leftStarts = leftAbbreviation.toLowerCase().startsWith(needle.toLowerCase());
  const rightStarts = rightAbbreviation.toLowerCase().startsWith(needle.toLowerCase());
  if (leftStarts !== rightStarts) {
    return leftStarts ? -1 : 1;
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

export function hasAbbreviationMatch(workspaces: Workspace[], query: string): boolean {
  const range = getQueryRange(query);
  if (!range) {
    return false;
  }
  return workspaces.some((workspace) => containsText(workspace.abbreviation, range.query, range.start, range.length));
}

export function searchWorkspaces(workspaces: Workspace[], query: string): Workspace[] {
  const range = getQueryRange(query);
  if (!range) {
    return [...workspaces];
  }

  const abbreviationMatches = workspaces.filter((workspace) =>
    containsText(workspace.abbreviation, range.query, range.start, range.length),
  );
  if (abbreviationMatches.length > 0) {
    return [...abbreviationMatches].sort((left, right) => compareAbbreviationMatch(left, right, range));
  }

  return workspaces.filter((workspace) => matchesWorkspace(workspace, range));
}

function getTaskSearchTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreToken(
  value: string | null | undefined,
  token: string,
  weights: { exact: number; prefix: number; contains: number },
): number {
  if (!value) {
    return 0;
  }
  const haystack = value.toLowerCase();
  const needle = token.toLowerCase();
  if (haystack === needle) {
    return weights.exact;
  }
  if (haystack.startsWith(needle)) {
    return weights.prefix;
  }
  if (haystack.includes(needle)) {
    return weights.contains;
  }
  return 0;
}

function computeTaskActionScore(workspace: Workspace, launch: LaunchEntry, tokens: string[]): number {
  let score = 0;
  let matchedLaunchSpecificField = false;

  for (const token of tokens) {
    const workspaceScore =
      scoreToken(workspace.abbreviation, token, { exact: 900, prefix: 650, contains: 200 }) +
      scoreToken(workspace.name, token, { exact: 700, prefix: 450, contains: 160 }) +
      scoreToken(workspace.directory, token, { exact: 100, prefix: 80, contains: 40 });

    const launchScore =
      scoreToken(launch.label, token, { exact: 1000, prefix: 750, contains: 300 }) +
      scoreToken(launch.command, token, { exact: 850, prefix: 600, contains: 260 }) +
      scoreToken(launch.wtProfile, token, { exact: 220, prefix: 160, contains: 80 });

    if (workspaceScore + launchScore === 0) {
      return 0;
    }

    if (launchScore > 0) {
      matchedLaunchSpecificField = true;
    }

    score += workspaceScore + launchScore;
  }

  if (!matchedLaunchSpecificField) {
    return 0;
  }

  return score + Math.max(0, 50 - launch.order);
}

export function searchTaskActions(workspaces: Workspace[], query: string): WorkspaceListItem[] {
  const tokens = getTaskSearchTokens(query);
  if (tokens.length === 0) {
    return [];
  }

  const matches: WorkspaceListItem[] = [];
  for (const workspace of workspaces) {
    for (const launch of workspace.launches) {
      if (!launch.isEnabled) {
        continue;
      }
      const score = computeTaskActionScore(workspace, launch, tokens);
      if (score <= 0) {
        continue;
      }
      matches.push({ workspace, launch, score });
    }
  }

  return matches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    const nameCompare = left.workspace.name.localeCompare(right.workspace.name, undefined, {
      sensitivity: "base",
    });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return (left.launch?.order ?? 0) - (right.launch?.order ?? 0);
  });
}

export function workspaceMatchesQuery(workspace: Workspace, query: string): boolean {
  const range = getQueryRange(query);
  if (!range) {
    return true;
  }
  return matchesWorkspace(workspace, range);
}
