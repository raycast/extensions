import { run } from "../shell";
import { InstalledApp, UpdateInfo } from "../types";
import { hasUpdate } from "../version";

function extractRepo(url: string): { owner: string; repo: string } | null {
  // https://github.com/owner/repo  |  github.com/owner/repo  |  raw.githubusercontent.com/owner/repo/...
  const m = url.match(
    /github(?:usercontent)?\.com\/([^/]+)\/([^/]+?)(?:\.git|\/|$)/i,
  );
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

export async function checkGitHub(
  app: InstalledApp,
): Promise<UpdateInfo | null> {
  // Look for github in Sparkle feed URL first (most common signal)
  const candidates = [app.sparkleFeedUrl].filter(Boolean) as string[];
  let repo: { owner: string; repo: string } | null = null;
  for (const c of candidates) {
    repo = extractRepo(c);
    if (repo) break;
  }
  if (!repo) return null;

  try {
    // execFile via run() — owner/repo are extracted from a plist string we
    // don't control, so they can't be safely interpolated into a shell command.
    const { stdout } = await run("/usr/bin/curl", [
      "-sL",
      "--max-time",
      "10",
      "-H",
      "Accept: application/vnd.github+json",
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`,
    ]);
    const data = JSON.parse(stdout);
    if (!data?.tag_name) return null;
    const version = String(data.tag_name).replace(/^v/i, "");
    return {
      app,
      source: "github",
      latestVersion: version,
      hasUpdate: hasUpdate(app.version, app.buildNumber, version),
      releaseNotesUrl: data.html_url,
      downloadUrl: data.assets?.[0]?.browser_download_url ?? data.html_url,
      checkedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
