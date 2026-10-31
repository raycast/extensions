import {
  Clipboard,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { useEffect, useRef } from "react";
import { FolnaroApi } from "./folnaro";
import { BUNDLE_ID, locateHelper } from "./locate";
import { McpClient, type ToolClient, type ToolResult } from "./mcp-client";
import { describeError } from "./presentation";
import { t } from "./text";

/** Folnaro on the Mac App Store; the product page id is set once the app is listed. */
export const APP_STORE_SEARCH_URL = "macappstore://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?q=Folnaro";

function spotlightApps(): string[] {
  try {
    return execFileSync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`], {
      encoding: "utf8",
      timeout: 2000,
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * A client for one command invocation. The helper starts lazily on the first call, so a command
 * that only shows cached data never spawns it. Errors locating the helper surface on that first
 * call, as a `FolnaroError` like every other failure.
 */
export function createFolnaro(): FolnaroApi {
  const preferences = getPreferenceValues<Preferences>();
  let client: McpClient | undefined;
  let failure: unknown;
  try {
    const helper = locateHelper({ overridePath: preferences.helperPath, spotlightPaths: spotlightApps });
    client = new McpClient({
      command: helper.command,
      args: helper.args,
      env: { FOLNARO_LANGUAGE: "en" },
      clientName: "raycast",
      clientVersion: "1.0.0",
    });
  } catch (error) {
    failure = error;
  }
  return new FolnaroApi(client ?? new FailingClient(failure));
}

/** Stands in for the client when the helper could not be located; every call rejects. */
class FailingClient implements ToolClient {
  constructor(private readonly error: unknown) {}
  listToolNames(): Promise<Set<string>> {
    return Promise.reject(this.error);
  }
  callTool<T>(): Promise<ToolResult<T>> {
    return Promise.reject(this.error);
  }
  close(): void {}
}

/** One helper process for the lifetime of a view command, closed when the command closes. */
export function useFolnaro(): FolnaroApi {
  const ref = useRef<FolnaroApi | null>(null);
  if (!ref.current) ref.current = createFolnaro();
  useEffect(() => () => ref.current?.client.close(), []);
  return ref.current;
}

/** Runs `body` with a fresh helper and always ends it (no-view and menu bar commands). */
export async function withFolnaro<T>(body: (api: FolnaroApi) => Promise<T>): Promise<T> {
  const api = createFolnaro();
  try {
    return await body(api);
  } finally {
    api.client.close();
  }
}

export function openFolnaro(url?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/open", url ? ["-b", BUNDLE_ID, url] : ["-b", BUNDLE_ID], (error) =>
      error ? reject(error) : resolve(),
    );
  });
}

/** A calm failure toast with the next step as its action. */
export async function showError(error: unknown): Promise<Toast> {
  const presentation = describeError(error);
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: presentation.title,
    message: presentation.message,
  };
  if (presentation.offerAppStore) {
    options.primaryAction = { title: t("action.openAppStore"), onAction: () => open(APP_STORE_SEARCH_URL) };
    options.secondaryAction = {
      title: t("action.openExtensionPreferences"),
      onAction: () => openExtensionPreferences(),
    };
  } else if (presentation.offerOpenFolnaro) {
    options.primaryAction = { title: t("action.openFolnaro"), onAction: () => openFolnaro().catch(() => undefined) };
  }
  if (!options.secondaryAction && presentation.message) {
    const details = presentation.message;
    options.secondaryAction = { title: t("action.copyErrorDetails"), onAction: () => Clipboard.copy(details) };
  }
  return showToast(options);
}

/** Writes a document's PDF to the extension's support folder and returns its path. */
export async function savePdf(api: FolnaroApi, documentId: string): Promise<string> {
  const { meta, bytes } = await api.documentPdf(documentId);
  const folder = join(environment.supportPath, "pdf");
  mkdirSync(folder, { recursive: true });
  const path = join(folder, basename(meta.file_name || `${documentId}.pdf`));
  writeFileSync(path, bytes);
  return path;
}

/** Shows a file in Quick Look, like ⌘Y in Finder. */
export function quickLook(path: string): void {
  const child = execFile("/usr/bin/qlmanage", ["-p", path], () => undefined);
  child.unref();
}
