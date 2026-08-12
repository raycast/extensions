import parseUrl from "parse-url";

type GitRemote = {
  host: string;
  url: string;
};

export function parseGitRemote(remoteUrl: string): GitRemote | undefined {
  try {
    const parsedUrl = parseUrl(remoteUrl.trim(), false);
    const repositoryPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");

    if (!parsedUrl.resource || !repositoryPath) {
      return undefined;
    }

    const host = parsedUrl.port ? `${parsedUrl.resource}:${parsedUrl.port}` : parsedUrl.resource;

    return {
      host,
      url: `https://${host}/${repositoryPath}`,
    };
  } catch {
    return undefined;
  }
}
