import { execFile, execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

import { Color, getPreferenceValues, Keyboard, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

import { getErrorMessage } from "./errors";

export const WEB_IDES: {
  title: string;
  baseUrl: string;
  icon?: { source: string; tintColor?: Color };
  shortcut?: Keyboard.Shortcut;
}[] = [
  {
    title: "github.dev",
    baseUrl: "https://github.dev/",
    icon: { source: "github-dev.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "VS Code for the Web",
    baseUrl: "https://vscode.dev/github/",
    icon: { source: "vscode.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
    icon: { source: "codesandbox.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Replit",
    baseUrl: `https://repl.it/github/`,
    icon: { source: "replit.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
    icon: { source: "gitpod.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
    icon: { source: "glitch.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
    icon: { source: "sourcegraph.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "DeepWiki",
    baseUrl: "https://deepwiki.com/",
    icon: { source: "deepwiki.png" },
    shortcut: { modifiers: ["cmd"], key: "d" },
  },
  {
    title: "VS Code Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: { source: "vscode.svg", tintColor: Color.PrimaryText },
  },
];

const VISITED_REPOSITORIES_LENGTH = 25;

export async function cloneAndOpen(repository: ExtendedRepositoryFieldsFragment) {
  const { application, baseClonePath, repositoryCloneProtocol } = getPreferenceValues<Preferences.SearchRepositories>();
  const applicationPath = application?.path.replaceAll(" ", "\\ ");
  const clonePath = `${baseClonePath}/${repository.name}`;
  const openCommand = `open -a ${applicationPath} ${clonePath}`;

  const toast = await showToast({
    title: `Opening ${repository.name}`,
    message: `at ${clonePath}`,
    style: Toast.Style.Animated,
  });

  if (!existsSync(clonePath.replace("~", homedir()))) {
    try {
      execFileSync("git", buildCloneCommandArgs(repository.nameWithOwner, repositoryCloneProtocol), {
        cwd: baseClonePath,
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error while cloning the repository";
      toast.message = getErrorMessage(error);
      console.error(error);
      return;
    }
  }

  try {
    execSync(openCommand, { cwd: baseClonePath });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error while opening the repository";
    toast.message = getErrorMessage(error);
    console.error(error);
    return;
  }

  toast.title = "Code editor launched!";
  toast.style = Toast.Style.Success;
}

export function useHistory(searchText: string | undefined, searchFilter: string | null) {
  const [history, setHistory] = useCachedState<ExtendedRepositoryFieldsFragment[]>("history", []);

  function visitRepository(repository: ExtendedRepositoryFieldsFragment) {
    const nextRepositories = [repository, ...(history?.filter((item) => item.id !== repository.id) ?? [])].slice(
      0,
      VISITED_REPOSITORIES_LENGTH,
    );
    setHistory(nextRepositories);
  }

  let data = history;

  if (searchText) {
    data = data.filter((r) => r.nameWithOwner.toLowerCase().includes(searchText.toLowerCase()));
  }

  if (searchFilter) {
    // Converting query filter string to regexp:
    const repositoryFilter = `${searchFilter.replaceAll(/org:|user:/g, "").replaceAll(" ", "|")}/.*`;
    data = data.filter((r) => r.nameWithOwner.match(repositoryFilter));
  }

  return { data, visitRepository };
}

export const REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Relevance", value: "" },
  { title: "Last Update", value: "sort:updated-desc" },
  { title: "Name", value: "sort:name-asc" },
  { title: "Stars", value: "sort:stars-desc" },
  { title: "Forks", value: "sort:forks-desc" },
];
export const MY_REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Last Pushed", value: "pushed_at:desc" },
  { title: "Name", value: "name:asc" },
  { title: "Stars", value: "stargazers:desc" },
];
export const STARRED_REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Recently Starred", value: "starred_at:desc" },
  { title: "Oldest Starred", value: "starred_at:asc" },
];
export const REPO_DEFAULT_SORT_QUERY = REPO_SORT_TYPES_TO_QUERIES[0].value;
export const MY_REPO_DEFAULT_SORT_QUERY = MY_REPO_SORT_TYPES_TO_QUERIES[0].value;
export const STARRED_REPO_DEFAULT_SORT_QUERY = STARRED_REPO_SORT_TYPES_TO_QUERIES[0].value;

export const ACCEPTABLE_CLONE_PROTOCOLS = ["https", "ssh"] as const;
export type AcceptableCloneProtocol = (typeof ACCEPTABLE_CLONE_PROTOCOLS)[number];
export const CLONE_PROTOCOLS_TO_LABELS = {
  https: "HTTPS",
  ssh: "SSH",
} as const satisfies Record<AcceptableCloneProtocol, string>;

export const ACCEPTABLE_CLONE_TOOLS = ["git", "gh"] as const;
export type AcceptableCloneTool = (typeof ACCEPTABLE_CLONE_TOOLS)[number];
export const CLONE_TOOLS_TO_LABELS = {
  git: "Git",
  gh: "GitHub CLI",
} as const satisfies Record<AcceptableCloneTool, string>;

/**
 * Format the clone command based on specified protocol.
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param cloneProtocol {AcceptableCloneProtocol} Clone protocol
 * @returns {string} Executable clone command
 */
export const buildCloneCommand = (
  repoNameWithOwner: string,
  cloneProtocol: AcceptableCloneProtocol,
  options?: Partial<AdditionalCloneFormatOptions>,
): string => {
  const gitFlag = options?.gitFlags?.join(" ") ?? "";
  const targetDir = (options?.targetDir ?? "").replace(/"/g, '\\"');

  const cloneUrl = formatRepositoryUrl(repoNameWithOwner, cloneProtocol);
  let cloneCmd = `git clone ${gitFlag} ${cloneUrl}`;

  if (targetDir) {
    cloneCmd += ` "${targetDir}"`;
  }

  return cloneCmd;
};

/**
 * Build the argument list for a `git clone` execution.
 *
 * The command and its arguments are returned separately so they can be spawned
 * without a shell, preventing user-controlled values (branch, target directory)
 * from being interpreted as shell syntax.
 *
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param cloneProtocol {AcceptableCloneProtocol} Clone protocol
 * @param options {Partial<AdditionalCloneFormatOptions>} Optional target directory and git flags.
 * @returns {string[]} Arguments for `git clone` (without the executable).
 */
export const buildCloneCommandArgs = (
  repoNameWithOwner: string,
  cloneProtocol: AcceptableCloneProtocol,
  options?: Partial<AdditionalCloneFormatOptions>,
): string[] => {
  const gitFlags = options?.gitFlags ?? [];
  const targetDir = options?.targetDir ?? "";

  const cloneArgs = ["clone", ...gitFlags, formatRepositoryUrl(repoNameWithOwner, cloneProtocol)];
  if (targetDir) {
    cloneArgs.push(targetDir);
  }

  return cloneArgs;
};

type AdditionalCloneFormatOptions = {
  /**
   * Target directory for the cloned repository.
   */
  targetDir: string;
  /**
   * Additional git flags to be passed to the clone command.
   *
   * Elements will join with a space.
   *
   * @example ["--depth", "1", "-b", "main"]
   */
  gitFlags: string[];
};

/**
 * Build the argument list for a `gh repo clone` execution.
 *
 * The target directory and git flags (e.g. `-b <branch>`) are preserved and
 * forwarded to `git clone`, while authentication, protocol and any other
 * configuration come from the user's existing `gh` setup.
 *
 * The command and its arguments are returned separately so they can be spawned
 * without a shell, preventing user-controlled values (branch, target directory)
 * from being interpreted as shell syntax.
 *
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param options {Partial<AdditionalCloneFormatOptions>} Optional target directory and git flags.
 * @returns {string[]} Arguments for `gh repo clone` (without the executable).
 */
export const buildGhCloneCommandArgs = (
  repoNameWithOwner: string,
  options?: Partial<AdditionalCloneFormatOptions>,
): string[] => {
  const gitFlags = options?.gitFlags ?? [];
  const targetDir = options?.targetDir ?? "";

  const cloneArgs = ["repo", "clone", repoNameWithOwner];
  if (targetDir) {
    cloneArgs.push(targetDir);
  }
  if (gitFlags.length > 0) {
    cloneArgs.push("--", ...gitFlags);
  }

  return cloneArgs;
};

/**
 * Result of checking the availability of the GitHub CLI on the user's machine.
 */
export type GhAvailability =
  | { available: true; executable: string }
  | { available: false; reason: "not-installed" | "not-authenticated" };

const execFileAsync = promisify(execFile);

const GH_EXECUTABLE_SUFFIXES = ["/gh", "\\gh", "/gh.exe", "\\gh.exe"];

// Patterns matching terminal escape sequences (e.g. iTerm shell integration).
// Built from character codes so no control characters appear in the source.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const TERMINAL_OSC_PATTERN = new RegExp(`${ESC}][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`, "g");
const TERMINAL_CSI_PATTERN = new RegExp(`${ESC}\\[[0-9;?]*[A-Za-z]`, "g");
const TERMINAL_CHARSET_PATTERN = new RegExp(`${ESC}\\([0-9A-Za-z]`, "g");

/**
 * Extract the path to the `gh` executable from a shell `command -v` invocation.
 *
 * Terminal escape sequences (e.g. iTerm shell integration) and shell-declared
 * aliases/functions are filtered out so only a real filesystem path is returned.
 *
 * @param output {string} Raw stdout of a `command -v gh` invocation.
 * @returns {string | undefined} The resolved `gh` path, if any.
 */
function extractGhExecutablePath(output: string): string | undefined {
  const sanitized = output
    .replace(TERMINAL_OSC_PATTERN, "")
    .replace(TERMINAL_CSI_PATTERN, "")
    .replace(TERMINAL_CHARSET_PATTERN, "");

  for (const rawLine of sanitized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^(alias|builtin|function)\s/i.test(line)) {
      continue;
    }
    if (GH_EXECUTABLE_SUFFIXES.some((suffix) => line.endsWith(suffix))) {
      return line;
    }
  }

  return undefined;
}

/**
 * Resolve the path to the `gh` executable.
 *
 * Raycast's inherited `PATH` omits directories such as Homebrew's
 * `/opt/homebrew/bin`, so the executable is resolved through the user's shell
 * (sourcing their profile and rc files) before falling back to a plain `PATH`
 * lookup.
 *
 * @returns {Promise<string>} Absolute path to `gh`, or `"gh"` to rely on `PATH`.
 */
async function resolveGhExecutable(): Promise<string> {
  const shell = process.env.SHELL;
  if (shell) {
    for (const flag of ["-l", "-i"]) {
      try {
        const { stdout } = await execFileAsync(shell, [flag, "-c", "command -v gh"], {
          timeout: 5000,
          maxBuffer: 1024 * 1024,
        });
        const resolved = extractGhExecutablePath(stdout.toString());
        if (resolved) {
          return resolved;
        }
      } catch {
        // Fall through to the next resolution strategy.
      }
    }
  }

  return "gh";
}

/**
 * Check whether the GitHub CLI is installed and authenticated on the user's machine.
 *
 * @returns {Promise<GhAvailability>} The availability status of the GitHub CLI.
 */
export async function getGhAvailability(): Promise<GhAvailability> {
  const executable = await resolveGhExecutable();

  try {
    await execFileAsync(executable, ["--version"]);
  } catch {
    return { available: false, reason: "not-installed" };
  }

  try {
    await execFileAsync(executable, ["auth", "status"]);
  } catch {
    return { available: false, reason: "not-authenticated" };
  }

  return { available: true, executable };
}

/**
 * Format the repository URL based on specified protocol.
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param protocol {"https" | "ssh"} Git protocol
 * @returns {string} Formatted repository URL
 */
const formatRepositoryUrl = (repoNameWithOwner: string, protocol: "https" | "ssh"): string =>
  protocol === "https" ? `https://github.com/${repoNameWithOwner}.git` : `git@github.com:${repoNameWithOwner}.git`;

/**
 * Rewrite relative links and images in a README so they render correctly in a
 * Raycast `Detail` view.
 *
 * GitHub returns README content with paths relative to the repository, which
 * Raycast cannot resolve on its own. Using the raw `download_url` of the README
 * (e.g. `https://raw.githubusercontent.com/owner/repo/main/README.md`) as the
 * base, relative image sources are rewritten to absolute `raw.githubusercontent.com`
 * URLs (so they display) and relative links are rewritten to `github.com/.../blob/...`
 * URLs (so they open the right page). Absolute URLs, anchors and other schemes are
 * left untouched.
 *
 * @param markdown {string} Raw README markdown.
 * @param rawDownloadUrl {string} The README's raw download URL from the GitHub API.
 * @param readmePath {string} The README's path within the repository (e.g. `.github/README.md`),
 *   used to resolve root-relative paths (starting with `/`) against the repository root.
 * @returns {string} Markdown with relative URLs rewritten to absolute ones.
 */
export function rewriteReadmeUrls(markdown: string, rawDownloadUrl: string, readmePath = ""): string {
  if (!rawDownloadUrl) {
    return markdown;
  }

  // Insert `/blob/` after `owner/repo` instead of guessing the ref segment, so
  // subdirectory READMEs (`.github/`, `docs/`) and slash-containing refs stay intact.
  const toBlob = (raw: string) =>
    raw.replace(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//, "https://github.com/$1/$2/blob/");

  // `*Dir` is the README's own directory (for normal relative paths); `*Root` is the
  // repository root at the same ref (for root-relative paths that start with `/`).
  const rawDir = rawDownloadUrl.slice(0, rawDownloadUrl.lastIndexOf("/") + 1);
  const rawRoot = readmePath ? rawDownloadUrl.slice(0, rawDownloadUrl.length - readmePath.length) : rawDir;
  const blobDir = toBlob(rawDir);
  const blobRoot = toBlob(rawRoot);

  const isAbsolute = (url: string) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//") || url.startsWith("#");

  const resolve = (url: string, dirBase: string, rootBase: string) => {
    const trimmed = url.trim();
    if (!trimmed || isAbsolute(trimmed)) {
      return url;
    }
    try {
      return trimmed.startsWith("/")
        ? new URL(trimmed.replace(/^\/+/, ""), rootBase).toString()
        : new URL(trimmed, dirBase).toString();
    } catch {
      return url;
    }
  };

  // Allow one level of balanced parentheses so filenames like `image(1).png`
  // aren't truncated; the trailing group captures an optional title.
  const destination = "((?:\\([^)]*\\)|[^()\\s])+)([^)]*)";
  const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${destination}\\)`, "g");
  const linkPattern = new RegExp(`(?<!!)\\[([^\\]]+)\\]\\(${destination}\\)`, "g");

  return markdown
    .replace(imagePattern, (_m, alt, url, tail) => `![${alt}](${resolve(url, rawDir, rawRoot)}${tail})`)
    .replace(linkPattern, (_m, text, url, tail) => `[${text}](${resolve(url, blobDir, blobRoot)}${tail})`)
    .replace(
      /(<img[^>]+src=["'])([^"']+)(["'])/gi,
      (_m, pre, url, post) => `${pre}${resolve(url, rawDir, rawRoot)}${post}`,
    )
    .replace(
      /(<a[^>]+href=["'])([^"']+)(["'])/gi,
      (_m, pre, url, post) => `${pre}${resolve(url, blobDir, blobRoot)}${post}`,
    );
}

/**
 * Get the repository filter string based on the filter mode, repository list, and selected repository.
 *
 * @param {Preferences.MyIssues["repositoryFilterMode"]} filterMode - The mode to filter repositories ("all", "include", or "exclude").
 * @param {string[]} repositoryList - The list of repositories to include or exclude.
 * @param {string | null} selectedRepository - The selected repository to filter.
 * @returns {string} The repository filter string.
 */
export function getRepositoryFilter(
  filterMode: Preferences.MyIssues["repositoryFilterMode"],
  repositoryList: string[],
  selectedRepository: string | null,
) {
  if (selectedRepository) {
    return `repo:${selectedRepository}`;
  }

  const list = repositoryList.filter(Boolean);
  return filterMode === "all"
    ? ""
    : filterMode === "exclude"
      ? list.map((repo) => `-repo:${repo}`).join(" ")
      : list.map((repo) => `repo:${repo}`).join(" ");
}
