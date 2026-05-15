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
  const repo = repoFull?.includes("/") ? repoFull.split("/")[1] : repoFull;

  const owner = getTokenValue(raw, SearchToken.Owner) ?? (repoFull?.includes("/") ? repoFull.split("/")[0] : undefined);

  const query = stripToken(raw, SearchToken.Repo, SearchToken.Owner).trim();

  return { query, owner, repo };
}
