import { AI, Cache, environment, getPreferenceValues } from "@raycast/api";
import { Email, EmailContent, getEmailContents, Link } from "./jmap";

export type LoginInfo = { code: string | null; link: string | null };

const cache = new Cache({ namespace: "login-info" });

const LOGIN_PATTERN =
  /\b(code|verif\w*|otp|one[- ]time|passcode|pin|log ?in|sign ?in|magic link|confirm\w*|activate|2fa|two[- ]factor|authenticat\w*|reset (your )?password)\b/i;

const LOGIN_LINK_PATTERN = /verif|confirm|log.?in|sign.?in|magic|activat|auth|reset|token/i;

const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// Only recent emails that look like a login email get their body fetched and read.
export function looksLikeLogin(email: Email): boolean {
  return (
    Date.now() - email.receivedAt.getTime() < MAX_AGE_MS && LOGIN_PATTERN.test(`${email.subject} ${email.preview}`)
  );
}

// Codes and links are only useful for a few days, so they're kept no longer than the emails they come from.
type CachedEntries = Record<string, LoginInfo & { expiresAt: number }>;
const CACHE_KEY = "entries";

function cachedEntries(): CachedEntries {
  const cached = cache.get(CACHE_KEY);
  return cached ? (JSON.parse(cached) as CachedEntries) : {};
}

export function cachedLoginInfo(emailId: string): LoginInfo | undefined {
  const entry = cachedEntries()[emailId];
  return entry && entry.expiresAt > Date.now() ? { code: entry.code, link: entry.link } : undefined;
}

function cacheLoginInfo(found: Map<string, LoginInfo>, emails: Email[]): void {
  const now = Date.now();
  const entries = Object.fromEntries(Object.entries(cachedEntries()).filter(([, entry]) => entry.expiresAt > now));
  for (const email of emails) {
    const info = found.get(email.id);
    if (info) entries[email.id] = { ...info, expiresAt: email.receivedAt.getTime() + MAX_AGE_MS };
  }
  cache.set(CACHE_KEY, JSON.stringify(entries));
}

export async function detectLoginInfo(emails: Email[]): Promise<Map<string, LoginInfo>> {
  const results = new Map<string, LoginInfo>();
  const pending = emails.filter((email) => {
    const cached = cachedLoginInfo(email.id);
    if (cached) results.set(email.id, cached);
    return !cached;
  });
  if (pending.length === 0) return results;

  const contents = await getEmailContents(pending.map((email) => email.id));
  const useAI = getPreferenceValues<Preferences>().useAI && environment.canAccess(AI);
  const found = new Map<string, LoginInfo>();

  await Promise.all(
    pending.map(async (email) => {
      const content = contents.get(email.id);
      if (!content) return;
      const info = (useAI && (await extractWithAI(email, content))) || extractWithPatterns(email, content);
      found.set(email.id, info);
      results.set(email.id, info);
    }),
  );
  cacheLoginInfo(found, pending);
  return results;
}

async function extractWithAI(email: Email, content: EmailContent): Promise<LoginInfo | null> {
  const links = content.links.slice(0, 40).map((link, index) => `${index + 1}. ${link.title} -> ${link.url}`);
  const prompt = [
    "This email may be a login, sign-up or verification email.",
    "Extract the one-time code (verification code, login code, PIN) and/or the link the user must click to log in, verify or confirm.",
    'Reply with JSON only: {"code": string|null, "link": number|null}, where link is the number of the link in the list.',
    "Use null when there is no such code or link. Ignore unsubscribe, tracking, help and marketing links.",
    "",
    `Subject: ${email.subject}`,
    `From: ${email.from?.email ?? ""}`,
    "",
    content.text.slice(0, 6000),
    "",
    "Links:",
    ...links,
  ].join("\n");

  try {
    const answer = await AI.ask(prompt, { creativity: "none" });
    const json = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1)) as {
      code?: string | null;
      link?: number | null;
    };
    const code = json.code?.trim() || null;
    const link = typeof json.link === "number" ? (content.links[json.link - 1]?.url ?? null) : null;
    // Only trust a code that actually appears in the email.
    const haystack = `${email.subject} ${content.text}`;
    return { code: code && haystack.includes(code) ? code : null, link };
  } catch {
    return null;
  }
}

function extractWithPatterns(email: Email, content: EmailContent): LoginInfo {
  return { code: findCode(email.subject, content.text), link: findLoginLink(content.links) };
}

// A 4-8 digit, "A1B-2C3" or 6-char uppercase token in the subject, or a 4-8 digit number
// shortly after the word "code" in the body. Dates, times and years don't count.
function findCode(subject: string, text: string): string | null {
  const digits = /(?<![\d\-/.:])(\d{4,8})(?![\d\-/:]|\.\d)/g;
  const isYear = (value: string) => /^(19|20)\d\d$/.test(value);

  const inSubject =
    [...subject.matchAll(digits)].map((m) => m[1]).find((value) => !isYear(value)) ??
    subject.match(/\b([A-Z0-9]{3}-[A-Z0-9]{3})\b/)?.[1] ??
    subject.match(/\b((?=[A-Z0-9]*[A-Z])[A-Z0-9]{6})\b/)?.[1];
  if (inSubject) return inSubject;

  const nearCode = text.match(/code\b[^0-9]{0,80}?(?<![\d\-/.:])(\d{4,8})(?![\d\-/:]|\.\d)/i);
  return nearCode && !isYear(nearCode[1]) ? nearCode[1] : null;
}

function findLoginLink(links: Link[]): string | null {
  const match = links.find(
    (link) => LOGIN_LINK_PATTERN.test(`${link.title} ${link.url}`) && !/unsubscribe|preferences/i.test(link.url),
  );
  return match?.url ?? null;
}
