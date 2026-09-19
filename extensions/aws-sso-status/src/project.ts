/** Public source repository. Links open only after an explicit user action. */
const repositoryUrl = "https://github.com/burger66leo/raycast-aws-sso-status";
export function githubRepositoryUrl(value: string = repositoryUrl): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    )
      return undefined;
    if (!/^\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
