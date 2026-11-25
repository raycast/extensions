import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const SEARCH_BROWSER_BUNDLE_ID = "com.officecommun.search";

async function openAddressBarInput(value: string): Promise<void> {
  await closeMainWindow();
  await runAppleScript(
    `on run argv
  set addressBarInput to item 1 of argv
  tell application id "${SEARCH_BROWSER_BUNDLE_ID}" to activate
  tell application "System Events"
    tell process "Search"
      keystroke "t" using {command down}
      delay 0.15
      keystroke "l" using {command down}
      keystroke addressBarInput
      key code 36
    end tell
  end tell
end run`,
    [value],
  );
}

export async function openInSearchBrowser(url: string): Promise<void> {
  const parsedURL = new URL(url);
  if (parsedURL.protocol !== "https:" && parsedURL.protocol !== "http:") {
    throw new Error("Only web addresses can be opened in Search Browser.");
  }

  await openAddressBarInput(parsedURL.toString());
}

export async function openSearchInput(input: string): Promise<void> {
  const value = input.trim();
  if (!value) throw new Error("Provide a URL or search query.");
  if (value.length > 2048)
    throw new Error("The URL or search query is too long.");
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !webAddress(value)) {
    throw new Error("Only HTTP and HTTPS websites can be opened.");
  }

  await openAddressBarInput(webAddress(value) ?? value);
}

export function webAddress(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export async function readOptionalJSON(
  filePath: string,
): Promise<unknown | undefined> {
  const { readFile } = await import("node:fs/promises");
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}
