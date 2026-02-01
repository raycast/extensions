import { isAbsolute } from "path"

export interface ParsedSource {
  type: "github" | "gitlab" | "git" | "local" | "direct-url" | "well-known"
  url: string
  subpath?: string
  localPath?: string
  ref?: string
  skillFilter?: string
}

function isLocalPath(input: string): boolean {
  return (
    isAbsolute(input) ||
    input.startsWith("./") ||
    input.startsWith("../") ||
    input === "." ||
    input === ".." ||
    /^[a-zA-Z]:[/\\]/.test(input)
  )
}

export function parseSource(input: string): ParsedSource {
  // Handle GitHub URLs
  if (input.includes("github.com")) {
    const match = input.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/(.+))?$/)
    if (match) {
      return {
        type: "github",
        url: `https://github.com/${match[1]}/${match[2]}.git`,
        subpath: match[3],
      }
    }
  }

  // Handle GitLab URLs
  if (input.includes("gitlab.com")) {
    const match = input.match(/gitlab\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/(.+))?$/)
    if (match) {
      return {
        type: "gitlab",
        url: `https://gitlab.com/${match[1]}/${match[2]}.git`,
        subpath: match[3],
      }
    }
  }

  // Handle owner/repo format
  const ownerRepoMatch = input.match(/^([^/@]+)\/([^/@]+)(?:@(.+))?(?:\/(.+))?$/)
  if (ownerRepoMatch && !input.includes("://")) {
    return {
      type: "github",
      url: `https://github.com/${ownerRepoMatch[1]}/${ownerRepoMatch[2]}.git`,
      ref: ownerRepoMatch[3],
      subpath: ownerRepoMatch[4],
      skillFilter: ownerRepoMatch[3]?.includes("/") ? undefined : ownerRepoMatch[3],
    }
  }

  // Handle local paths
  if (isLocalPath(input)) {
    return {
      type: "local",
      url: input,
      localPath: input,
    }
  }

  // Default to GitHub
  return {
    type: "github",
    url: input.startsWith("http") ? input : `https://github.com/${input}.git`,
  }
}
