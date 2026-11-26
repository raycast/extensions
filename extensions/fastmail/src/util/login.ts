import { AI, environment, getPreferenceValues, LaunchType, LocalStorage } from "@raycast/api";
import { Email, EmailContent, getEmailContents, Link } from "./jmap";

export type LoginInfo = { code: string | null; link: string | null };

const LOGIN_PATTERN =
  /\b(code|verif\w*|otp|one[- ]time|passcode|pin|log ?in|sign ?in|magic link|confirm\w*|activate|2fa|two[- ]factor|authenticat\w*|reset (your )?password)\b/i;

const LOGIN_LINK_PATTERN = /verif|confirm|log.?in|sign.?in|magic|activat|auth|reset|token/i;

const CODE_SUBJECT = /\b(code|verif\w*|otp|one[- ]time|passcode|pin|log ?in|sign ?in|2fa|security|confirm\w*)\b/i;

const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// Only recent emails that look like a login email get their body fetched and read.
export function looksLikeLogin(email: Email): boolean {
  return (
    Date.now() - email.receivedAt.getTime() < MAX_AGE_MS && LOGIN_PATTERN.test(`${email.subject} ${email.preview}`)
  );
}

// Codes and links are only useful for a few days, so they're kept no longer than the emails
// they come from. They're secrets, so they live in Raycast's encrypted LocalStorage.
type StoredEntries = Record<string, LoginInfo & { expiresAt: number }>;
const STORAGE_KEY = "loginCodes";

// Raycast AI allows a handful of requests a minute, so one load asks about a few emails at most.
const MAX_AI_REQUESTS = 3;

async function storedEntries(): Promise<StoredEntries> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  const entries = stored ? (JSON.parse(stored) as StoredEntries) : {};
  const now = Date.now();
  return Object.fromEntries(Object.entries(entries).filter(([, entry]) => entry.expiresAt > now));
}

export async function detectLoginInfo(emails: Email[]): Promise<Map<string, LoginInfo>> {
  const entries = await storedEntries();
  const results = new Map<string, LoginInfo>();
  const pending = emails.filter((email) => {
    const entry = entries[email.id];
    if (entry) results.set(email.id, { code: entry.code, link: entry.link });
    return !entry;
  });

  if (pending.length > 0) {
    const contents = await getEmailContents(pending.map((email) => email.id));
    // Background runs (the menu bar's refresh) never use AI, so its budget goes to things you opened.
    const aiEnabled =
      getPreferenceValues<Preferences>().useAI &&
      environment.canAccess(AI) &&
      environment.launchType === LaunchType.UserInitiated;
    let aiRequests = 0;

    for (const email of pending) {
      const content = contents.get(email.id);
      if (!content) continue;
      const patterns = extractWithPatterns(email, content);
      const askAI = aiEnabled && aiRequests < MAX_AI_REQUESTS;
      if (askAI) aiRequests++;
      const ai = askAI ? await extractWithAI(email, content) : null;
      const info = { code: ai?.code ?? patterns.code, link: ai?.link ?? patterns.link };
      results.set(email.id, info);
      // An email AI should have read but didn't is left uncached so a later load can try again.
      if (!aiEnabled || ai) entries[email.id] = { ...info, expiresAt: email.receivedAt.getTime() + MAX_AGE_MS };
    }
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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

// A 4-8 digit, "A1B-2C3" or 6-char uppercase-and-digit token in the subject, or a 4-8 digit
// number shortly after the word "code" in the body. Dates, times, years and plain words don't count.
function findCode(subject: string, text: string): string | null {
  const digits = /(?<![\d\-/.:#])(\d{4,8})(?![\d\-/:]|\.\d)/g;
  const isYear = (value: string) => /^(19|20)\d\d$/.test(value);

  // A number in a subject like "[repo] Add extension (PR #34012)" isn't a code, so the subject has
  // to say it's about a code, and #-numbers never count.
  const inSubject =
    CODE_SUBJECT.test(subject) &&
    ([...subject.matchAll(digits)].map((m) => m[1]).find((value) => !isYear(value)) ??
      subject.match(/\b((?=[A-Z0-9-]*\d)[A-Z0-9]{3}-[A-Z0-9]{3})\b/)?.[1] ??
      subject.match(/\b((?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{6})\b/)?.[1]);
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
