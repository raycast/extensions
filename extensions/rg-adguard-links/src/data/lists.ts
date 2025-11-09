export type AdguardList = {
  id: string;
  name: string;
  category: "privacy" | "security" | "annoyance" | "dns" | "other";
  homepage: string;
  rawUrl: string;
};

export const LISTS: AdguardList[] = [
  {
    id: "adguard-base",
    name: "AdGuard Base Filter",
    category: "privacy",
    homepage: "https://adguard.com/kb/general/adguard-ad-filters/#base-filter",
    rawUrl: "https://filters.adtidy.org/extension/chromium/filters/2.txt",
  },
  {
    id: "adguard-privacy",
    name: "AdGuard Privacy Filter",
    category: "privacy",
    homepage: "https://adguard.com/kb/general/adguard-ad-filters/#privacy",
    rawUrl: "https://filters.adtidy.org/extension/chromium/filters/3.txt",
  },
  {
    id: "adguard-annoyances",
    name: "AdGuard Annoyances",
    category: "annoyance",
    homepage: "https://adguard.com/kb/general/adguard-ad-filters/#annoyances",
    rawUrl: "https://filters.adtidy.org/extension/chromium/filters/14.txt",
  },
  {
    id: "adguard-dns",
    name: "AdGuard DNS filter",
    category: "dns",
    homepage: "https://adguard-dns.io/kb/general/dns-filter/",
    rawUrl: "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
  },
];
