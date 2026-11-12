import {
  BrowserExtension,
  Clipboard,
  environment,
  getFrontmostApplication,
  getSelectedText,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import type { PondApi } from "pond-api";
import { pond } from "../api/client";
import { toError } from "../api/problems";
import { failToast } from "../components/problem";
import { hostname, saveLink } from "./links";
import { parseWebUrl, webUrl } from "./urls";

export type UrlOrigin = "selection" | "browser" | "clipboard";

export interface FoundUrl {
  url: string;
  origin: UrlOrigin;
}

export type EnqueueResult = Awaited<ReturnType<PondApi["enqueue"]>>;

/** AppleScript names for the active tab, by bundle id. The bundle id is checked against this list before use. */
const BROWSERS = new Map([
  ["com.apple.Safari", "current tab"],
  ["com.apple.SafariTechnologyPreview", "current tab"],
  ["com.google.Chrome", "active tab"],
  ["com.google.Chrome.canary", "active tab"],
  ["com.brave.Browser", "active tab"],
  ["com.microsoft.edgemac", "active tab"],
  ["company.thebrowser.Browser", "active tab"],
  ["org.chromium.Chromium", "active tab"],
  ["com.vivaldi.Vivaldi", "active tab"],
]);

async function extensionTabUrl(): Promise<string | null> {
  if (!environment.canAccess(BrowserExtension)) return null;
  const tabs = await BrowserExtension.getTabs().catch(() => []);
  return parseWebUrl(tabs.find((tab) => tab.active)?.url);
}

async function scriptedTabUrl(): Promise<string | null> {
  const app = await getFrontmostApplication().catch(() => null);
  const tab = app?.bundleId ? BROWSERS.get(app.bundleId) : undefined;
  if (!app?.bundleId || !tab) return null;
  const url = await runAppleScript(`tell application id "${app.bundleId}" to get URL of ${tab} of front window`).catch(
    () => null,
  );
  return parseWebUrl(url);
}

export async function browserTabUrl(): Promise<string | null> {
  return (await extensionTabUrl()) ?? (await scriptedTabUrl());
}

async function selectionUrl(): Promise<string | null> {
  return parseWebUrl(await getSelectedText().catch(() => null));
}

export async function clipboardUrl(): Promise<string | null> {
  return parseWebUrl(await Clipboard.readText().catch(() => undefined));
}

/** Selection wins because selecting a link is the most deliberate signal, then the page you're on. */
export async function findUrl(): Promise<FoundUrl | null> {
  const selection = await selectionUrl();
  if (selection) return { url: selection, origin: "selection" };
  const browser = await browserTabUrl();
  if (browser) return { url: browser, origin: "browser" };
  const clipboard = await clipboardUrl();
  if (clipboard) return { url: clipboard, origin: "clipboard" };
  return null;
}

export interface SaveOptions {
  tags?: string[];
  folderId?: string;
}

export function enqueue(url: string, options: SaveOptions = {}): Promise<EnqueueResult> {
  return pond().enqueue({
    url: webUrl(url),
    trigger: "raycast",
    tags: options.tags?.length ? options.tags : undefined,
    folderId: options.folderId || undefined,
  });
}

export function savedTitle(result: EnqueueResult, options: SaveOptions = {}): string {
  if (result.created) return "Saved to Pond";
  return options.tags?.length || options.folderId ? "Updated in Pond" : "Already in Pond";
}

/** Resolves the result, or `null` after showing why the save failed. */
export async function saveWithToast(
  resolveUrl: () => Promise<string | null>,
  options: SaveOptions = {},
): Promise<EnqueueResult | null> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Pond" });
  try {
    const target = await resolveUrl();
    if (!target) throw new Error("Select, open, or copy a web page first, then try again.");
    toast.message = hostname(target);
    const result = await enqueue(target, options);
    toast.style = Toast.Style.Success;
    toast.title = savedTitle(result, options);
    toast.primaryAction = { title: "Open in Pond", onAction: () => open(saveLink({ id: result.id })) };
    toast.secondaryAction = { title: "Copy URL", onAction: () => Clipboard.copy(target) };
    return result;
  } catch (error) {
    failToast(toast, toError(error), "Couldn't save the URL");
    return null;
  }
}
