import { BrowserExtension, environment } from "@raycast/api";
import { registrableDomain } from "./domain";
import { recentEmails } from "./jmap";
import { detectLoginInfo, looksLikeLogin } from "./login";

export const FRESH_MINUTES = 15;

export type FreshLogin = {
  id: string;
  code: string | null;
  link: string | null;
  sender: string;
  receivedAt: number;
  matchesTab: boolean;
};

// Login emails from the last few minutes that have a code or link, newest first, with the
// ones from the site in the browser's active tab ahead of the rest.
export async function freshLogins(): Promise<FreshLogin[]> {
  const [emails, tabDomain] = await Promise.all([
    recentEmails(new Date(Date.now() - FRESH_MINUTES * 60 * 1000)),
    activeTabDomain(),
  ]);
  const candidates = emails.filter(looksLikeLogin);
  const found = await detectLoginInfo(candidates);

  const logins = candidates.flatMap((email) => {
    const info = found.get(email.id);
    if (!info || (!info.code && !info.link)) return [];
    const senderDomain = email.from?.email.split("@")[1];
    return [
      {
        id: email.id,
        code: info.code,
        link: info.link,
        sender: email.from ? email.from.name || email.from.email : "Unknown sender",
        receivedAt: email.receivedAt.getTime(),
        matchesTab: Boolean(tabDomain && senderDomain && registrableDomain(senderDomain) === tabDomain),
      },
    ];
  });
  return logins.sort((a, b) => Number(b.matchesTab) - Number(a.matchesTab) || b.receivedAt - a.receivedAt);
}

// Needs the Raycast browser extension; without it there's simply no preference.
async function activeTabDomain(): Promise<string | undefined> {
  if (!environment.canAccess(BrowserExtension)) return undefined;
  try {
    const url = (await BrowserExtension.getTabs()).find((tab) => tab.active)?.url;
    return url ? registrableDomain(new URL(url).hostname) : undefined;
  } catch {
    return undefined;
  }
}
