enum SearchToken {
  Repo = "repo",
  Owner = "owner",
}

function getTokenValue(raw: string, token: SearchToken) {
  const match = raw.match(new RegExp(`\\b${token}:(\\S*)`, "i"));
  const value = match?.[1];
  return value === "" ? undefined : value;
}

function stripToken(raw: string, ...tokens: SearchToken[]) {
  return tokens.reduce((acc, token) => acc.replace(new RegExp(`\\b${token}:\\S*`, "gi"), ""), raw);
}

export function parseSearchQuery(raw: string) {
  const repoFull = getTokenValue(raw, SearchToken.Repo);

  // If repo filter contains "/", split into owner and repo; otherwise treat as repo name only
  const hasOwnerSlash = repoFull?.includes("/");
  const repo = hasOwnerSlash ? repoFull?.split("/")[1] : repoFull;

  // Owner can come from explicit owner: filter, or extracted from owner/repo format
  const repoOwner = hasOwnerSlash ? repoFull?.split("/")[0] : undefined;
  const owner = getTokenValue(raw, SearchToken.Owner) ?? repoOwner;

  const query = stripToken(raw, SearchToken.Repo, SearchToken.Owner).trim();

  return { query, owner, repo };
}
