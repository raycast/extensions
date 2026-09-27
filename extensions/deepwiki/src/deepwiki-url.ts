export function getDeepWikiUrls(repoIdentifier: string): { pageUrl: string; repositoryUrl: string } {
  const identifier = repoIdentifier.trim()
  let url: URL

  if (/^[\w.-]+\/[\w.-]+$/.test(identifier)) {
    url = new URL(`https://deepwiki.com/${identifier}`)
  } else {
    try {
      url = new URL(identifier)
    } catch {
      throw new Error("Enter an owner/repo identifier, GitHub URL, or DeepWiki URL.")
    }

    if (url.protocol !== "https:") {
      throw new Error("Use an HTTPS GitHub or DeepWiki URL.")
    }

    if (url.hostname === "github.com" || url.hostname === "www.github.com") {
      const [owner, repo] = url.pathname.split("/").filter(Boolean)
      if (!owner || !repo) {
        throw new Error("The GitHub URL must include an owner and repository.")
      }
      url = new URL(`https://deepwiki.com/${owner}/${repo}`)
    } else if (url.hostname !== "deepwiki.com") {
      throw new Error("Enter a GitHub or DeepWiki repository URL.")
    }
  }

  const [owner, repo] = url.pathname.split("/").filter(Boolean)
  if (!owner || !repo) {
    throw new Error("The repository URL must include an owner and repository.")
  }

  return {
    pageUrl: url.toString(),
    repositoryUrl: `https://deepwiki.com/${owner}/${repo}/`,
  }
}
