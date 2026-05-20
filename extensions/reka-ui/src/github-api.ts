import { getPreferenceValues } from "@raycast/api"

export const GITHUB_API_VERSION = "2026-03-10"

export function getGithubPat(): string {
  return getPreferenceValues<Preferences>().ghPat ?? ""
}

export function getGithubHeaders(pat = getGithubPat()): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    ...(pat ? { Authorization: `Bearer ${pat}` } : {}),
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  }
}

export function getGithubFetchErrorMessage(status: number, statusText: string): string {
  if (status === 403 || status === 429) {
    return "GitHub API rate limit exceeded. Add a PAT in extension preferences or try again later."
  }

  return statusText || `Request failed (${status})`
}

export function isRateLimitError(error: Error): boolean {
  return /rate limit|403|429/i.test(error.message)
}
