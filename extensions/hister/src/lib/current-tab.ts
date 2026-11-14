import { BrowserExtension, environment } from "@raycast/api";
import { useEffect, useState } from "react";

export type CurrentTab = { url: string; title: string; host: string; favicon?: string };

function normalize(title?: string): string {
  return title?.replace(/\s+/g, " ").trim() ?? "";
}

// getTabs marks one active tab per window but not which window is focused; getContent reads the focused one.
async function focusedTab(active: BrowserExtension.Tab[]): Promise<BrowserExtension.Tab | undefined> {
  const title = normalize(await BrowserExtension.getContent({ cssSelector: "title", format: "text" }).catch(() => ""));
  if (!title) return undefined;
  const matches = active.filter((tab) => normalize(tab.title) === title);
  return matches.length && matches.every((tab) => tab.url === matches[0].url) ? matches[0] : undefined;
}

async function getCurrentTab(): Promise<CurrentTab | undefined> {
  if (!environment.canAccess(BrowserExtension)) return undefined;
  const active = (await BrowserExtension.getTabs()).filter((tab) => tab.active);
  const tab = active.length > 1 ? await focusedTab(active) : active[0];
  if (!tab || !/^https?:\/\//i.test(tab.url)) return undefined;
  return { url: tab.url, title: tab.title || tab.url, host: new URL(tab.url).hostname, favicon: tab.favicon };
}

function sameTab(a?: CurrentTab, b?: CurrentTab): boolean {
  return a?.url === b?.url && a?.title === b?.title && a?.favicon === b?.favicon;
}

/** Undefined without Raycast's browser extension, or when the focused tab isn't a web page. */
export function useCurrentTab(): CurrentTab | undefined {
  const [tab, setTab] = useState<CurrentTab>();

  // Raycast resumes a closed command without remounting it, so a tab read once goes stale.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = () =>
      getCurrentTab()
        .then(
          (next) => {
            if (!cancelled) setTab((current) => (sameTab(current, next) ? current : next));
          },
          () => undefined,
        )
        .finally(() => {
          if (!cancelled) timer = setTimeout(check, 2000);
        });
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return tab;
}
