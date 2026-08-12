type GitRemote = {
  host: string;
  url: string;
};

export function parseGitRemote(remoteUrl: string): GitRemote | undefined {
  const trimmedUrl = remoteUrl.trim();
  const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(trimmedUrl);
  const scpLikeMatch =
    trimmedUrl.includes("://") || isWindowsPath ? undefined : trimmedUrl.match(/^(?:([^@/]+)@)?([^:/]+):(.+)$/);
  const normalizedUrl = scpLikeMatch
    ? `ssh://${scpLikeMatch[1] ? `${scpLikeMatch[1]}@` : ""}${scpLikeMatch[2]}/${scpLikeMatch[3]}`
    : trimmedUrl;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const repositoryPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");

    if (!parsedUrl.host || !repositoryPath) {
      return undefined;
    }

    return {
      host: parsedUrl.host,
      url: `https://${parsedUrl.host}/${repositoryPath}`,
    };
  } catch {
    return undefined;
  }
}
