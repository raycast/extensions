import {
  BrowserExtension,
  WindowManagement,
  environment,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { NativeContext } from "../types";

const execFileAsync = promisify(execFile);
const MAX_BROWSER_MARKDOWN = 80_000;

async function getWindowTitle(
  applicationName?: string,
): Promise<string | undefined> {
  if (!applicationName) return undefined;
  const script = `on run argv
set appName to item 1 of argv
tell application "System Events"
  try
    tell process appName to return name of front window
  on error
    return ""
  end try
end tell
end run`;
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-e", script, applicationName],
      { timeout: 2_500 },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Best-effort with a deadline: context must never hold up a capture. */
async function attempt<T>(
  work: () => Promise<T>,
  timeoutMs: number,
): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getBrowserContext(): Promise<
  NativeContext["browser"] | undefined
> {
  if (!environment.canAccess(BrowserExtension)) return undefined;
  const tabs = await BrowserExtension.getTabs();
  const active = tabs.find((tab) => tab.active);
  if (!active) return undefined;
  const markdown = await attempt(
    () => BrowserExtension.getContent({ tabId: active.id, format: "markdown" }),
    4_000,
  );
  return {
    title: active.title,
    url: active.url,
    markdown: markdown?.slice(0, MAX_BROWSER_MARKDOWN),
  };
}

/**
 * Every source is independent, so they all run concurrently — the wall time is
 * the slowest single source (bounded by its timeout) instead of the sum of all
 * of them, which made captures take many seconds.
 */
export async function collectNativeContext(): Promise<NativeContext> {
  const context: NativeContext = { capturedAt: new Date().toISOString() };

  const application = await attempt(() => getFrontmostApplication(), 2_000);
  const [managedWindow, selectedText, finderItems, browser, scriptedTitle] =
    await Promise.all([
      environment.canAccess(WindowManagement)
        ? attempt(() => WindowManagement.getActiveWindow(), 2_000)
        : undefined,
      attempt(() => getSelectedText(), 2_500),
      attempt(() => getSelectedFinderItems(), 2_000),
      attempt(() => getBrowserContext(), 6_000),
      attempt(() => getWindowTitle(application?.name), 2_500),
    ]);

  if (application) {
    context.application = {
      name: application.name,
      bundleId: application.bundleId,
      path: application.path,
    };
  }
  if (managedWindow) {
    context.window = {
      id: managedWindow.id,
      bounds:
        managedWindow.bounds === "fullscreen"
          ? "fullscreen"
          : JSON.stringify(managedWindow.bounds),
    };
    if (managedWindow.application) {
      context.application = {
        name: managedWindow.application.name,
        bundleId: managedWindow.application.bundleId,
        path: managedWindow.application.path,
      };
    }
  }
  if (selectedText) context.selectedText = selectedText;
  if (finderItems?.length) {
    context.selectedFinderItems = finderItems.map((item) => item.path);
  }
  if (browser) context.browser = browser;

  const title = scriptedTitle ?? context.browser?.title;
  if (title || context.window) {
    context.window = { ...context.window, title };
  }
  return context;
}

export function formatContext(context: NativeContext): string {
  const lines: string[] = [];
  if (context.application) {
    lines.push(
      `Application: ${context.application.name}${context.application.bundleId ? ` (${context.application.bundleId})` : ""}`,
    );
  }
  if (context.window?.title)
    lines.push(`Window title: ${context.window.title}`);
  if (context.window?.bounds)
    lines.push(`Window bounds: ${context.window.bounds}`);
  if (context.browser?.title)
    lines.push(`Browser title: ${context.browser.title}`);
  if (context.browser?.url) lines.push(`Browser URL: ${context.browser.url}`);
  if (context.selectedText)
    lines.push(`Selected text:\n${context.selectedText}`);
  if (context.selectedFinderItems?.length)
    lines.push(
      `Selected Finder items:\n${context.selectedFinderItems.join("\n")}`,
    );
  if (context.browser?.markdown)
    lines.push(`Browser page content:\n${context.browser.markdown}`);
  return lines.join("\n\n");
}

export function inferProject(
  projects: { name: string; namespace: string; repositoryURL: string }[],
  context: NativeContext,
): number | undefined {
  const haystack = [
    context.window?.title,
    context.browser?.title,
    context.browser?.url,
    context.selectedText?.slice(0, 5_000),
    ...(context.selectedFinderItems ?? []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  if (!haystack) return undefined;

  let best: { index: number; score: number } | undefined;
  projects.forEach((project, index) => {
    const repository = project.repositoryURL
      .replace(/\.git$/, "")
      .toLowerCase();
    const repoPath = repository.replace(/^https?:\/\//, "");
    const repoName = repoPath.split("/").at(-1) ?? "";
    let score = 0;
    if (haystack.includes(repository) || haystack.includes(repoPath))
      score += 100;
    if (repoName.length >= 4 && haystack.includes(repoName)) score += 20;
    if (
      project.name.length >= 4 &&
      haystack.includes(project.name.toLowerCase())
    )
      score += 15;
    if (
      project.namespace.length >= 4 &&
      haystack.includes(project.namespace.toLowerCase())
    )
      score += 10;
    if (!best || score > best.score) best = { index, score };
  });
  return best && best.score >= 20 ? best.index : undefined;
}
