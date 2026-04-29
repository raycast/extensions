const HEYCLAUDE_HOSTS = new Set(["heyclau.de", "www.heyclau.de"]);

export const HEYCLAUDE_URL = "https://heyclau.de";
export const GITHUB_REPO_URL =
  "https://github.com/JSONbored/claudepro-directory";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const GITHUB_DISCUSSIONS_URL = `${GITHUB_REPO_URL}/discussions`;
export const X_URL = "https://x.com/jsonbored";
export const DISCORD_URL = "https://discord.com/invite/Ax3Py4YDrq";
export const RAYCAST_STORE_URL = "https://www.raycast.com/jsonbored/heyclaude";

export function withRaycastUtm(value: string, content?: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!HEYCLAUDE_HOSTS.has(url.hostname)) return trimmed;

    url.searchParams.set("utm_source", "raycast");
    url.searchParams.set("utm_medium", "extension");
    if (content) url.searchParams.set("utm_content", content);
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function markdownLink(title: string, url: string) {
  return `[${title}](${url})`;
}
