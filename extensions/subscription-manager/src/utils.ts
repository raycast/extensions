import { Icon, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { randomUUID } from "crypto";
import { BillingCycle, Subscription } from "./types";

export function generateId(): string {
  return randomUUID();
}

export function getServiceUrl(nameOrDomain: string, isDomain = false): string {
  if (isDomain) return `https://${nameOrDomain}`;
  const domain = nameOrDomain.toLowerCase().replace(/\s+/g, "");
  return `https://${domain}.com`;
}

function getSubscriptionFaviconUrl(sub: Pick<Subscription, "name" | "iconUrl">): string {
  const preset = PRESET_SERVICES.find((s) => s.name === sub.name);
  if (sub.iconUrl) {
    const legacyMatch = sub.iconUrl.match(/domain=([^&]+)/);
    if (legacyMatch) return `https://${legacyMatch[1]}`;
    return sub.iconUrl;
  }
  if (preset) return `https://${preset.domain}`;
  return getServiceUrl(sub.name);
}

export function getSubscriptionIcon(sub: Pick<Subscription, "name" | "iconUrl">) {
  return getFavicon(getSubscriptionFaviconUrl(sub), { fallback: Icon.CreditCard });
}

export function getServiceIcon(domain: string) {
  return getFavicon(getServiceUrl(domain, true), { fallback: Icon.Globe });
}

export function formatCurrency(amount: number, currency: string): string {
  const { roundingEnabled, abbreviateNumbers } = getPreferenceValues<Preferences>();
  const useCompact = abbreviateNumbers && amount >= 10000;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: roundingEnabled ? 0 : 2,
    notation: useCompact ? "compact" : "standard",
  }).format(amount);
}

export function formatCycle(cycle: BillingCycle): string {
  switch (cycle) {
    case "monthly":
      return "/mo";
    case "yearly":
      return "/yr";
    case "quarterly":
      return "/qtr";
    case "half-yearly":
      return "/6mo";
    case "weekly":
      return "/wk";
  }
}

export function formatStartDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSubscriptionActiveInMonth(sub: Subscription, month: number, year: number): boolean {
  const start = new Date(sub.startDate + "T00:00:00");
  const lastDayOfMonth = new Date(year, month + 1, 0);
  if (start > lastDayOfMonth) return false;
  if (sub.billingCycle === "monthly") return true;
  if (sub.billingCycle === "yearly") return start.getMonth() === month;
  if (sub.billingCycle === "quarterly") return (month - start.getMonth() + 12) % 3 === 0;
  if (sub.billingCycle === "half-yearly") return (month - start.getMonth() + 12) % 6 === 0;
  return true;
}

export function getMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "half-yearly":
      return amount / 6;
    case "weekly":
      return amount * 4.33;
  }
}

// rates: from Frankfurter API fetched with primaryCurrency as base.
// e.g. base=INR → rates = { USD: 0.012, EUR: 0.011, ... }
// conversion: subAmount / rates[subCurrency] = amount in primaryCurrency
export function getMonthlyTotal(
  subscriptions: Subscription[],
  month: number,
  year: number,
  primaryCurrency?: string,
  rates?: Record<string, number>,
): number {
  return subscriptions
    .filter((s) => s.status === "active")
    .filter((s) => isSubscriptionActiveInMonth(s, month, year))
    .reduce((sum, s) => {
      const monthly = getMonthlyEquivalent(s.amount, s.billingCycle);
      if (!primaryCurrency || !rates || s.currency === primaryCurrency) return sum + monthly;
      const rate = rates[s.currency];
      // rate = how many subCurrency per 1 primaryCurrency
      return sum + (rate ? monthly / rate : monthly);
    }, 0);
}

export function getNextBillingDate(sub: Subscription): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 366; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (getSubscriptionsForDay(d.getDate(), d.getMonth(), d.getFullYear(), [sub]).length > 0) return d;
  }
  return null;
}

export function getSubscriptionsForDay(
  day: number,
  month: number,
  year: number,
  subscriptions: Subscription[],
): Subscription[] {
  return subscriptions.filter((s) => {
    if (s.status !== "active") return false;
    const start = new Date(s.startDate + "T00:00:00");
    const subStart = new Date(year, month, day);
    if (subStart < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
    switch (s.billingCycle) {
      case "monthly":
        return s.billingDay === day;
      case "yearly":
        return s.billingDay === day && start.getMonth() === month;
      case "quarterly":
        return s.billingDay === day && (month - start.getMonth() + 12) % 3 === 0;
      case "half-yearly":
        return s.billingDay === day && (month - start.getMonth() + 12) % 6 === 0;
      case "weekly":
        return Math.round((subStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) % 7 === 0;
    }
  });
}

export function getMonthSubscriptions(month: number, year: number, subscriptions: Subscription[]): Subscription[] {
  return subscriptions
    .filter((s) => s.status === "active")
    .filter((s) => isSubscriptionActiveInMonth(s, month, year))
    .sort((a, b) => a.billingDay - b.billingDay);
}

export function buildCalendarMarkdown(year: number, month: number, subscriptions: Subscription[]): string {
  const today = new Date();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const header = `| **Sun** | **Mon** | **Tue** | **Wed** | **Thu** | **Fri** | **Sat** |`;
  const separator = `|:---:|:---:|:---:|:---:|:---:|:---:|:---:|`;

  const superscripts: Record<number, string> = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  const rows = weeks.map((wk) => {
    const cells = wk.map((day) => {
      if (day === null) return "   ";
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const daySubs = getSubscriptionsForDay(day, month, year, subscriptions);
      const count = daySubs.length;
      if (count === 0) return isToday ? `**• ${day}**` : `${day}`;
      const dot = count === 1 ? "●" : `●${superscripts[count] ?? `⁺`}`;
      return isToday ? `**• ${day} ${dot}**` : `**${day} ${dot}**`;
    });
    return `| ${cells.join(" | ")} |`;
  });

  const table = [header, separator, ...rows].join("\n");

  return `## ${monthName} ${year}\n\n${table}`;
}

export const CATEGORIES = [
  "Entertainment",
  "Productivity",
  "AI Tools",
  "Health & Fitness",
  "News & Media",
  "Software & Tools",
  "Cloud Storage",
  "Finance",
  "Other",
];

export const CURRENCIES = [
  { value: "INR", title: "INR", flag: "🇮🇳" },
  { value: "USD", title: "USD", flag: "🇺🇸" },
  { value: "EUR", title: "EUR", flag: "🇪🇺" },
  { value: "GBP", title: "GBP", flag: "🇬🇧" },
  { value: "JPY", title: "JPY", flag: "🇯🇵" },
  { value: "AUD", title: "AUD", flag: "🇦🇺" },
  { value: "CAD", title: "CAD", flag: "🇨🇦" },
  { value: "SGD", title: "SGD", flag: "🇸🇬" },
  { value: "BRL", title: "BRL", flag: "🇧🇷" },
  { value: "CHF", title: "CHF", flag: "🇨🇭" },
  { value: "CNY", title: "CNY", flag: "🇨🇳" },
  { value: "HKD", title: "HKD", flag: "🇭🇰" },
  { value: "IDR", title: "IDR", flag: "🇮🇩" },
  { value: "KRW", title: "KRW", flag: "🇰🇷" },
  { value: "MXN", title: "MXN", flag: "🇲🇽" },
  { value: "MYR", title: "MYR", flag: "🇲🇾" },
  { value: "NOK", title: "NOK", flag: "🇳🇴" },
  { value: "NZD", title: "NZD", flag: "🇳🇿" },
  { value: "PHP", title: "PHP", flag: "🇵🇭" },
  { value: "SEK", title: "SEK", flag: "🇸🇪" },
  { value: "THB", title: "THB", flag: "🇹🇭" },
  { value: "TRY", title: "TRY", flag: "🇹🇷" },
  { value: "ZAR", title: "ZAR", flag: "🇿🇦" },
];

export const LISTS = ["Personal", "Work", "Family"];

export const PRESET_PAYMENT_METHODS = [
  { value: "Credit Card", title: "Credit Card", icon: "💳" },
  { value: "Debit Card", title: "Debit Card", icon: "💳" },
  { value: "UPI", title: "UPI", icon: "📱" },
];

export const PRESET_SERVICES = [
  { name: "Netflix", domain: "netflix.com", category: "Entertainment" },
  { name: "Spotify", domain: "spotify.com", category: "Entertainment" },
  { name: "YouTube", domain: "youtube.com", category: "Entertainment" },
  { name: "Apple Music", domain: "music.apple.com", category: "Entertainment" },
  { name: "Apple TV+", domain: "tv.apple.com", category: "Entertainment" },
  { name: "Disney+", domain: "disneyplus.com", category: "Entertainment" },
  { name: "Amazon Prime", domain: "primevideo.com", category: "Entertainment" },
  { name: "HBO Max", domain: "max.com", category: "Entertainment" },
  { name: "Hulu", domain: "hulu.com", category: "Entertainment" },
  { name: "Crunchyroll", domain: "crunchyroll.com", category: "Entertainment" },
  { name: "Audible", domain: "audible.com", category: "Entertainment" },
  { name: "Nintendo Switch Online", domain: "nintendo.com", category: "Entertainment" },
  { name: "PlayStation", domain: "playstation.com", category: "Entertainment" },
  { name: "Xbox Game Pass", domain: "xbox.com", category: "Entertainment" },
  { name: "Notion", domain: "notion.so", category: "Productivity" },
  { name: "Microsoft 365", domain: "microsoft.com", category: "Productivity" },
  { name: "Slack", domain: "slack.com", category: "Productivity" },
  { name: "Zoom", domain: "zoom.us", category: "Productivity" },
  { name: "LinkedIn", domain: "linkedin.com", category: "Productivity" },
  { name: "Duolingo", domain: "duolingo.com", category: "Productivity" },
  { name: "Claude", domain: "claude.ai", category: "AI Tools" },
  { name: "ChatGPT", domain: "openai.com", category: "AI Tools" },
  { name: "Cursor", domain: "cursor.com", category: "AI Tools" },
  { name: "Gemini", domain: "gemini.google.com", category: "AI Tools" },
  { name: "Perplexity", domain: "perplexity.ai", category: "AI Tools" },
  { name: "Midjourney", domain: "midjourney.com", category: "AI Tools" },
  { name: "GitHub Copilot", domain: "github.com", category: "AI Tools" },
  { name: "ElevenLabs", domain: "elevenlabs.io", category: "AI Tools" },
  { name: "Runway", domain: "runwayml.com", category: "AI Tools" },
  { name: "GitHub", domain: "github.com", category: "Software & Tools" },
  { name: "Adobe Creative Cloud", domain: "adobe.com", category: "Software & Tools" },
  { name: "Figma", domain: "figma.com", category: "Software & Tools" },
  { name: "Canva", domain: "canva.com", category: "Software & Tools" },
  { name: "1Password", domain: "1password.com", category: "Software & Tools" },
  { name: "NordVPN", domain: "nordvpn.com", category: "Software & Tools" },
  { name: "X Premium", domain: "x.com", category: "Software & Tools" },
  { name: "Google One", domain: "one.google.com", category: "Cloud Storage" },
  { name: "iCloud+", domain: "icloud.com", category: "Cloud Storage" },
  { name: "Dropbox", domain: "dropbox.com", category: "Cloud Storage" },
];
