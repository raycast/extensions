type BrowserTab = { url: string; title?: string; active: boolean };

export type BrowserDiagnostics = {
  browserStatus: "connected" | "unavailable";
  tabCount: number;
  activeTabHosts: string[];
  source: "active-tab" | "clipboard" | "none";
};

export function isSharePointUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.hostname.endsWith(".sharepoint.com")
    );
  } catch {
    return false;
  }
}

export async function resolveBrowserTarget(
  getTabs: () => Promise<BrowserTab[]>,
  readClipboard: () => Promise<string | undefined>,
  reportDiagnostics: (diagnostics: BrowserDiagnostics) => void = () => {},
): Promise<{ url: string; title?: string }> {
  let browserError: unknown;
  const diagnostics: BrowserDiagnostics = {
    browserStatus: "unavailable",
    tabCount: 0,
    activeTabHosts: [],
    source: "none",
  };
  try {
    const tabs = await getTabs();
    diagnostics.browserStatus = "connected";
    diagnostics.tabCount = tabs.length;
    diagnostics.activeTabHosts = [
      ...new Set(
        tabs
          .filter((tab) => tab.active)
          .flatMap((tab) => {
            try {
              return [new URL(tab.url).hostname];
            } catch {
              return [];
            }
          }),
      ),
    ];
    const tab = tabs.find((tab) => tab.active && isSharePointUrl(tab.url));
    if (tab) {
      reportDiagnostics({ ...diagnostics, source: "active-tab" });
      return tab;
    }
  } catch (error) {
    browserError = error;
  }

  const clipboardUrl = (await readClipboard())?.trim();
  if (clipboardUrl && isSharePointUrl(clipboardUrl)) {
    reportDiagnostics({ ...diagnostics, source: "clipboard" });
    return { url: clipboardUrl };
  }

  reportDiagnostics(diagnostics);
  const signInPage = diagnostics.activeTabHosts.some((host) =>
    [
      "login.microsoftonline.com",
      "login.microsoft.com",
      "login.live.com",
    ].includes(host),
  );
  const message = signInPage
    ? "Sign in to SharePoint in your browser, open the file or folder, then run this command again. Copy the file or folder URL if the tab still cannot be read."
    : "Raycast couldn’t read an active SharePoint tab. Check you’re signed in to the Raycast browser extension and SharePoint. Copy the file or folder URL, then run this command again.";
  throw new Error(message, { cause: browserError });
}
