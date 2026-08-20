import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Common install locations for the GitHub CLI; Raycast commands don't inherit the user's shell PATH.
const GH_CLI_CANDIDATES = [
  "/opt/homebrew/bin/gh",
  "/usr/local/bin/gh",
  "/usr/bin/gh",
];

function findGhCli(): string | undefined {
  return GH_CLI_CANDIDATES.find((path) => existsSync(path));
}

/**
 * Some GitHub pages return limited metadata to unauthenticated fetches.
 * When the URL is a github.com issue/PR/repo, prefer the authenticated
 * `gh` CLI (using the user's existing `gh auth login` session) for the real title.
 */
async function fetchGitHubTitleViaCli(
  url: string,
): Promise<string | undefined> {
  const ghPath = findGhCli();
  if (!ghPath) {
    return undefined;
  }

  const prMatch = url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  const issueMatch = url.match(/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/);

  try {
    if (prMatch) {
      const [, repo, number] = prMatch;
      const { stdout } = await execFileAsync(ghPath, [
        "pr",
        "view",
        number,
        "--repo",
        repo,
        "--json",
        "title",
        "-q",
        ".title",
      ]);
      return stdout.trim() || undefined;
    }

    if (issueMatch) {
      const [, repo, number] = issueMatch;
      const { stdout } = await execFileAsync(ghPath, [
        "issue",
        "view",
        number,
        "--repo",
        repo,
        "--json",
        "title",
        "-q",
        ".title",
      ]);
      return stdout.trim() || undefined;
    }
  } catch {
    // Fall through to the plain HTTP fetch (e.g. not authenticated, repo doesn't exist, gh not logged in).
    return undefined;
  }

  return undefined;
}

/**
 * Extracts a human-readable title for a URL by fetching the page HTML.
 * Prefers <title>, falls back to og:title, then to the URL itself.
 */
async function fetchPageTitle(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
    );

    const rawTitle = titleMatch?.[1] ?? ogTitleMatch?.[1];
    if (!rawTitle) {
      return url;
    }

    return decodeHtmlEntities(rawTitle.trim());
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function CopySlackLink() {
  const clipboardText = (await Clipboard.readText())?.trim();

  if (!clipboardText || !isValidUrl(clipboardText)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No valid URL on clipboard",
      message: "Copy a link first, then run this command",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching page title…",
  });

  try {
    const url = new URL(clipboardText);
    const title =
      url.hostname === "github.com"
        ? ((await fetchGitHubTitleViaCli(clipboardText)) ??
          (await fetchPageTitle(clipboardText)))
        : await fetchPageTitle(clipboardText);

    await Clipboard.copy({
      text: clipboardText,
      html: `<a href="${escapeHtml(clipboardText)}">${escapeHtml(title)}</a>`,
    });
    toast.hide();
    await showHUD(`Copied: ${title}`);
  } catch (error) {
    // Fall back to a plain link so the command still produces something usable.
    await Clipboard.copy(clipboardText);
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't fetch title";
    toast.message =
      error instanceof Error ? error.message : "Copied plain link instead";
  }
}
