import parseUrl from "parse-url";

type GitRemote = {
  host: string;
  url: string;
};

export function parseGitRemote(remoteUrl: string): GitRemote | undefined {
  try {
    const parsedUrl = parseUrl(remoteUrl.trim(), false);
    const repositoryPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    const protocols = new Set(parsedUrl.protocols);
    const supportedProtocols = ["git", "http", "https", "ssh"];

    if (
      !parsedUrl.resource ||
      !repositoryPath ||
      protocols.size === 0 ||
      [...protocols].some((p) => !supportedProtocols.includes(p))
    ) {
      return undefined;
    }

    const browserProtocol = protocols.has("http") ? "http" : "https";
    const browserPort = protocols.has("http") || protocols.has("https") ? parsedUrl.port : undefined;
    const host = browserPort ? `${parsedUrl.resource}:${browserPort}` : parsedUrl.resource;

    return {
      host,
      url: `${browserProtocol}://${host}/${repositoryPath}`,
    };
  } catch {
    return undefined;
  }
}
