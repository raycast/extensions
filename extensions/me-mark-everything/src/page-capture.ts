export type Browser = { bundleId: string; name: string };
export type CurrentPage = { url: string; title: string; browser: string };
export type OriginApplication = {
  bundleId?: string;
  name: string;
  path?: string;
};
export const browsers: readonly Browser[] = [
  { bundleId: "com.google.Chrome", name: "Google Chrome" },
  { bundleId: "com.microsoft.edgemac", name: "Microsoft Edge" },
  { bundleId: "company.thebrowser.Browser", name: "Arc" },
];
export function identifyBrowser(app: OriginApplication): Browser {
  const byId = browsers.find((b) => b.bundleId === app.bundleId);
  if (byId) return byId;
  // Raycast's Application.bundleId is optional. Only exact known names are used;
  // never substitute whichever browser happens to be running in the background.
  if (!app.bundleId) {
    const byName = browsers.find((b) => app.name === b.name || app.name === b.name + ".app");
    if (byName) return byName;
  }
  throw Error(
    `Started from ${app.name || "an unknown app"}. Reopen Save Bookmark from Chrome, Edge or Arc, or paste a URL.`,
  );
}
export function parsePage(raw: string, browser: Browser): CurrentPage {
  let value: { url?: unknown; title?: unknown; error?: string };
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error(`Could not read ${browser.name}'s current page. Paste a URL or retry.`);
  }
  if (value?.error === "NOT_RUNNING")
    throw Error(`${browser.name} is no longer running. Open its page and retry, or paste a URL.`);
  if (value?.error === "NO_WINDOW")
    throw Error(`${browser.name} has no open window. Open a page and retry, or paste a URL.`);
  if (!value || typeof value.url !== "string" || typeof value.title !== "string")
    throw Error(`Could not read ${browser.name}'s current page. Paste a URL or retry.`);
  let url: URL;
  try {
    url = new URL(value.url);
  } catch {
    throw Error("This page has no web URL. Open an HTTP or HTTPS page, or paste a URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw Error("This is an internal browser page. Open an HTTP or HTTPS page, or paste a URL.");
  return { url: url.href, title: value.title, browser: browser.name };
}
export function pageReadFailure(error: unknown, browser: Browser): Error {
  const detail =
    error && typeof error === "object"
      ? (error as {
          message?: unknown;
          stderr?: unknown;
          timedOut?: boolean;
          name?: string;
        })
      : {};
  const message = [detail.message, detail.stderr].filter((v) => typeof v === "string").join("\n");
  if (detail.name === "AbortError") return Error("Page read cancelled.");
  if (/-1743|not authorized to send apple events|not permitted/i.test(message))
    return Error(
      `Allow Raycast to control ${browser.name} in System Settings → Privacy & Security → Automation, then retry. Manual entry is available.`,
    );
  if (detail.timedOut || /timed out|timeout|-1712/i.test(message))
    return Error(
      `${browser.name} did not respond. Check any macOS Automation prompt, then retry, or paste a URL.`,
    );
  return Error(
    `Could not read ${browser.name}. Check its active tab and Automation permission, then retry, or paste a URL.`,
  );
}
export function createPageReader(
  getOrigin: () => Promise<OriginApplication>,
  readBrowser: (browser: Browser) => Promise<CurrentPage>,
) {
  // Freeze the origin independently of the page read. A permission/timeout
  // retry must not re-identify Raycast as the source application.
  const origin = getOrigin()
    .then(identifyBrowser)
    .then(
      (browser) => ({ browser, error: undefined }),
      (error: unknown) => ({ browser: undefined, error }),
    );
  let reading: Promise<CurrentPage> | undefined;
  let generation = 0;
  return {
    read(): Promise<CurrentPage> {
      if (reading) return reading;
      const started = generation;
      const task = origin
        .then(async ({ browser, error }) => {
          if (started !== generation) throw Error("Page read cancelled.");
          if (!browser) throw error;
          const page = await readBrowser(browser);
          if (started !== generation) throw Error("Page read cancelled.");
          return page;
        })
        .finally(() => {
          if (reading === task) reading = undefined;
        });
      reading = task;
      return task;
    },
    cancel() {
      generation++;
      reading = undefined;
    },
  };
}
