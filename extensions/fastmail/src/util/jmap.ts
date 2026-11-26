import { LocalStorage } from "@raycast/api";
import { mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { tmpdir } from "os";
import { DEMO_TOKEN, demoContent, demoEmails, demoList, demoMailboxes, isDemo } from "./demo";
import { join } from "path";

const SESSION_URL = "https://api.fastmail.com/jmap/session";
const USING = ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"];
const PAGE_SIZE = 40;
const MAX_BODY_BYTES = 100_000;
const TOKEN_KEY = "apiToken";
const ATTACHMENTS_DIR = join(tmpdir(), "raycast-fastmail");
const ATTACHMENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type Address = { name: string | null; email: string };

type BodyPart = { partId: string; type: string };

type RawEmail = {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  subject: string | null;
  from: Address[] | null;
  to: Address[] | null;
  receivedAt: string;
  preview: string;
  hasAttachment: boolean;
  keywords: Record<string, boolean>;
  attachments: (Attachment & { disposition: string | null })[];
};

type RawContent = {
  id: string;
  textBody: BodyPart[];
  htmlBody: BodyPart[];
  bodyValues: Record<string, { value: string }>;
};

export type Email = {
  id: string;
  subject: string;
  from: Address | null;
  to: Address[];
  receivedAt: Date;
  preview: string;
  unread: boolean;
  mailboxIds: Record<string, boolean>;
  attachments: Attachment[];
  webUrl: string;
};

export type EmailContent = {
  body: string;
  text: string;
  links: Link[];
};

export type Attachment = { blobId: string; name: string | null; type: string; size: number };

export type Mailbox = { id: string; name: string; role: string | null; sortOrder: number };

export type EmailPage = { emails: Email[]; hasMore: boolean };

export type Link = { title: string; url: string };

export const TOKEN_SETTINGS_URL = "https://app.fastmail.com/settings/security/tokens";

export class InvalidTokenError extends Error {}

export class ReadOnlyTokenError extends Error {}

const PERMISSION_ERRORS = ["accountReadOnly", "forbidden"];

type Session = { apiUrl: string; downloadUrl: string; accountId: string; token: string };

let sessionPromise: Promise<Session> | null = null;
let mailboxesPromise: Promise<Mailbox[]> | null = null;
const contentCache = new Map<string, EmailContent>();

export async function getToken(): Promise<string | undefined> {
  if (isDemo()) return DEMO_TOKEN;
  return LocalStorage.getItem<string>(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  const session = await fetchSession(token.trim());
  await LocalStorage.setItem(TOKEN_KEY, session.token);
  sessionPromise = Promise.resolve(session);
  mailboxesPromise = null;
}

async function fetchSession(token: string): Promise<Session> {
  const response = await fetch(SESSION_URL, { headers: authHeaders(token) });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new InvalidTokenError("Invalid API token");
    throw new Error(`Fastmail session failed (${response.status})`);
  }
  const json = (await response.json()) as {
    apiUrl: string;
    downloadUrl: string;
    primaryAccounts: Record<string, string>;
  };
  return {
    apiUrl: json.apiUrl,
    downloadUrl: json.downloadUrl,
    accountId: json.primaryAccounts["urn:ietf:params:jmap:mail"],
    token,
  };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function getSession(): Promise<Session> {
  sessionPromise ??= getToken()
    .then((token) => {
      if (!token) throw new InvalidTokenError("No API token");
      return fetchSession(token);
    })
    .catch((error) => {
      sessionPromise = null;
      throw error;
    });
  return sessionPromise;
}

async function call<T extends unknown[]>(methodCalls: unknown[][]): Promise<T> {
  const session = await getSession();
  const response = await fetch(session.apiUrl, {
    method: "POST",
    headers: authHeaders(session.token),
    body: JSON.stringify({ using: USING, methodCalls }),
  });
  if (response.status === 401) {
    sessionPromise = null;
    mailboxesPromise = null;
    throw new InvalidTokenError("Invalid API token");
  }
  if (!response.ok) throw new Error(`Fastmail API ${response.status}: ${(await response.text()).slice(0, 200)}`);

  const { methodResponses } = (await response.json()) as { methodResponses: [string, Record<string, unknown>][] };
  const failure = methodResponses.find(([name]) => name === "error");
  if (failure) {
    if (PERMISSION_ERRORS.includes(failure[1].type as string)) throw new ReadOnlyTokenError("API token is read-only");
    throw new Error(`Fastmail API error: ${failure[1].type} ${failure[1].description ?? ""}`.trim());
  }

  return methodResponses.map(([, args]) => args) as T;
}

export async function getMailboxes(): Promise<Mailbox[]> {
  if (isDemo()) return demoMailboxes;
  mailboxesPromise ??= getSession()
    .then(({ accountId }) =>
      call<[{ list: Mailbox[] }]>([
        ["Mailbox/get", { accountId, properties: ["id", "name", "role", "sortOrder"] }, "mailboxes"],
      ]),
    )
    .then(([{ list }]) => list)
    .catch((error) => {
      mailboxesPromise = null;
      throw error;
    });
  return mailboxesPromise;
}

export const INBOX = "inbox";
export const ALL_MAIL = "all";

// With the Inbox selected, an empty search lists the inbox but typing searches all mail,
// since that's usually what you're after. Any other folder scopes both.
export async function listEmails(folder: string, query: string, page: number): Promise<EmailPage> {
  if (isDemo()) return { emails: page === 0 ? demoList(folder, query) : [], hasMore: false };
  const mailboxes = await getMailboxes();
  const conditions: Record<string, unknown>[] = parseQuery(query, mailboxes);

  if (folder === INBOX && !query) {
    conditions.push({ inMailbox: await mailboxIdForRole("inbox") });
  } else if (folder === INBOX || folder === ALL_MAIL) {
    const excluded = mailboxes.filter((m) => m.role === "junk" || m.role === "trash").map((m) => m.id);
    if (excluded.length > 0) conditions.push({ inMailboxOtherThan: excluded });
  } else {
    conditions.push({ inMailbox: folder });
  }

  const filter = conditions.length === 1 ? conditions[0] : { operator: "AND", conditions };
  const emails = await queryEmails(filter, page * PAGE_SIZE, mailboxes);
  return { emails, hasMore: emails.length === PAGE_SIZE };
}

// Everything received since the given time, newest first, except what's in the trash.
export async function recentEmails(since: Date): Promise<Email[]> {
  if (isDemo()) return demoEmails.filter((email) => email.receivedAt >= since && !email.mailboxIds.trash);
  const mailboxes = await getMailboxes();
  const trash = mailboxes.filter((m) => m.role === "trash").map((m) => m.id);
  const conditions: Record<string, unknown>[] = [{ after: since.toISOString().replace(/\.\d+Z$/, "Z") }];
  if (trash.length > 0) conditions.push({ inMailboxOtherThan: trash });
  return queryEmails({ operator: "AND", conditions }, 0, mailboxes);
}

export async function getEmailContents(ids: string[]): Promise<Map<string, EmailContent>> {
  if (isDemo()) return new Map(ids.flatMap((id) => (demoContent(id) ? [[id, demoContent(id)!]] : [])));
  const missing = ids.filter((id) => !contentCache.has(id));
  if (missing.length > 0) {
    const { accountId } = await getSession();
    const [{ list }] = await call<[{ list: RawContent[] }]>([
      [
        "Email/get",
        {
          accountId,
          ids: missing,
          properties: ["id", "textBody", "htmlBody", "bodyValues"],
          fetchTextBodyValues: true,
          fetchHTMLBodyValues: true,
          maxBodyValueBytes: MAX_BODY_BYTES,
        },
        "content",
      ],
    ]);
    for (const raw of list) contentCache.set(raw.id, toContent(raw));
  }
  return new Map(ids.flatMap((id) => (contentCache.has(id) ? [[id, contentCache.get(id)!]] : [])));
}

export async function getEmailContent(id: string): Promise<EmailContent> {
  const content = (await getEmailContents([id])).get(id);
  if (!content) throw new Error("Email not found");
  return content;
}

export async function openAttachment(attachment: Attachment): Promise<string> {
  if (isDemo()) throw new Error("Attachments don't open in demo mode");
  const { accountId, downloadUrl, token } = await getSession();
  const name = attachment.name || "attachment";
  const url = downloadUrl
    .replace("{accountId}", encodeURIComponent(accountId))
    .replace("{blobId}", encodeURIComponent(attachment.blobId))
    .replace("{name}", encodeURIComponent(name))
    .replace("{type}", encodeURIComponent(attachment.type));
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  await removeOldAttachments();
  const directory = join(ATTACHMENTS_DIR, attachment.blobId);
  await mkdir(directory, { recursive: true });
  const path = join(directory, name.replace(/[/\\]/g, "_"));
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

// Opened attachments are copies of email content, so they don't linger on disk.
async function removeOldAttachments(): Promise<void> {
  const entries = await readdir(ATTACHMENTS_DIR).catch(() => [] as string[]);
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(ATTACHMENTS_DIR, entry);
      const mtimeMs = (await stat(path).catch(() => null))?.mtimeMs ?? Date.now();
      if (Date.now() - mtimeMs > ATTACHMENT_MAX_AGE_MS) await rm(path, { recursive: true, force: true });
    }),
  );
}

export async function archiveEmail(id: string): Promise<void> {
  await updateEmail(id, { mailboxIds: { [await mailboxIdForRole("archive")]: true } });
}

export async function reportSpam(id: string): Promise<void> {
  await updateEmail(id, {
    mailboxIds: { [await mailboxIdForRole("junk")]: true },
    "keywords/$junk": true,
    "keywords/$notjunk": null,
  });
}

export async function trashEmail(id: string): Promise<void> {
  await updateEmail(id, { mailboxIds: { [await mailboxIdForRole("trash")]: true } });
}

export async function restoreEmail(email: Email): Promise<void> {
  await updateEmail(email.id, { mailboxIds: email.mailboxIds, "keywords/$junk": null });
}

export async function setRead(id: string, read: boolean): Promise<void> {
  await updateEmail(id, { "keywords/$seen": read || null });
}

async function mailboxIdForRole(role: string): Promise<string> {
  const mailbox = (await getMailboxes()).find((m) => m.role === role);
  if (!mailbox) throw new Error(`No ${role} folder found`);
  return mailbox.id;
}

async function updateEmail(id: string, patch: Record<string, unknown>): Promise<void> {
  if (isDemo()) return;
  const { accountId } = await getSession();
  const [{ notUpdated }] = await call<[{ notUpdated?: Record<string, { type: string; description?: string }> }]>([
    ["Email/set", { accountId, update: { [id]: patch } }, "set"],
  ]);
  const failure = notUpdated?.[id];
  if (!failure) return;
  if (PERMISSION_ERRORS.includes(failure.type)) throw new ReadOnlyTokenError("API token is read-only");
  throw new Error(`Couldn't update email: ${failure.type} ${failure.description ?? ""}`.trim());
}

async function queryEmails(filter: Record<string, unknown>, position: number, mailboxes: Mailbox[]): Promise<Email[]> {
  const { accountId } = await getSession();
  const [, { list }] = await call<[unknown, { list: RawEmail[] }]>([
    [
      "Email/query",
      {
        accountId,
        filter,
        sort: [{ property: "receivedAt", isAscending: false }],
        collapseThreads: false,
        position,
        limit: PAGE_SIZE,
      },
      "query",
    ],
    [
      "Email/get",
      {
        accountId,
        "#ids": { resultOf: "query", name: "Email/query", path: "/ids" },
        properties: [
          "id",
          "threadId",
          "mailboxIds",
          "subject",
          "from",
          "to",
          "receivedAt",
          "preview",
          "hasAttachment",
          "keywords",
          "attachments",
        ],
        bodyProperties: ["blobId", "name", "type", "size", "disposition"],
      },
      "emails",
    ],
  ]);
  return list.map((raw) => toEmail(raw, accountId, mailboxes));
}

// Supports from:, to:, subject:, body:, in:, is:unread/flagged, has:attachment, before:/after:
// (YYYY-MM-DD) and "quoted phrases". Everything else is full-text search.
function parseQuery(query: string, mailboxes: Mailbox[]): Record<string, unknown>[] {
  const tokens = query.match(/(\w+:)?"[^"]*"|\S+/g) ?? [];
  return tokens.map((token) => {
    const match = token.match(/^(\w+):(.+)$/);
    const [field, rawValue] = match ? [match[1].toLowerCase(), match[2]] : [null, token];
    const value = rawValue.replace(/^"|"$/g, "");

    switch (field) {
      case "from":
      case "to":
      case "cc":
      case "subject":
      case "body":
        return { [field]: value };
      case "in": {
        const mailbox = mailboxes.find(
          (m) => m.name.toLowerCase() === value.toLowerCase() || m.role === value.toLowerCase(),
        );
        return mailbox ? { inMailbox: mailbox.id } : { text: token };
      }
      case "is":
        if (value === "unread") return { notKeyword: "$seen" };
        if (value === "flagged" || value === "starred") return { hasKeyword: "$flagged" };
        break;
      case "has":
        if (value === "attachment") return { hasAttachment: true };
        break;
      case "before":
      case "after":
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { [field]: `${value}T00:00:00Z` };
        break;
    }
    return { text: value };
  });
}

function toEmail(raw: RawEmail, accountId: string, mailboxes: Mailbox[]): Email {
  const mailboxName = mailboxes.find((m) => raw.mailboxIds[m.id])?.name ?? "Inbox";

  return {
    id: raw.id,
    subject: raw.subject || "(no subject)",
    from: raw.from?.[0] ?? null,
    to: raw.to ?? [],
    receivedAt: new Date(raw.receivedAt),
    preview: raw.preview,
    unread: !raw.keywords["$seen"],
    mailboxIds: raw.mailboxIds,
    // Inline images (logos, signatures) are part of the body, not something you'd open.
    attachments: raw.attachments
      .filter((a) => !(a.disposition === "inline" && a.type.startsWith("image/")))
      .map(({ blobId, name, type, size }) => ({ blobId, name, type, size })),
    webUrl: `https://app.fastmail.com/mail/${encodeURIComponent(mailboxName)}/${raw.threadId}.${raw.id}?u=${accountId.replace(/^u/, "")}`,
  };
}

function toContent(raw: RawContent): EmailContent {
  const text = bodyText(raw.textBody, raw.bodyValues);
  const html = bodyText(raw.htmlBody, raw.bodyValues);
  const hasRealText = text.trim().length > 0 && raw.textBody.some((part) => part.type === "text/plain");

  return {
    body: html ? htmlToMarkdown(html) : text,
    text: hasRealText ? text : htmlToText(html),
    links: html ? htmlLinks(html) : textLinks(text),
  };
}

function bodyText(parts: BodyPart[], values: RawContent["bodyValues"]): string {
  return parts
    .map((part) => values[part.partId]?.value ?? "")
    .join("\n\n")
    .trim();
}

// Newsletter-style HTML is built from layout tables and tracking images, which render as
// junk in markdown, so flatten tables into blocks and drop images before converting.
function htmlToMarkdown(html: string): string {
  const flattened = stripNoise(html)
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<\/?(table|tbody|thead|tfoot|tr|td|th)\b[^>]*>/gi, "<div>");
  return NodeHtmlMarkdown.translate(flattened, { maxConsecutiveNewlines: 2 })
    .replace(/[\u034f\u00ad\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\[\s*\]\([^)]*\)/g, "")
    .replace(/^[ \t\u00a0]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(html: string): string {
  return stripNoise(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function stripNoise(html: string): string {
  return html.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "");
}

function htmlLinks(html: string): Link[] {
  const links: Link[] = [];
  for (const match of stripNoise(html).matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = decodeEntities(match[1]);
    if (!/^https?:/i.test(url)) continue;
    const title = decodeEntities(
      match[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    links.push({ title: title || url, url });
  }
  return uniqueLinks(links);
}

function textLinks(text: string): Link[] {
  const urls = text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
  return uniqueLinks(urls.map((url) => ({ title: url, url })));
}

function uniqueLinks(links: Link[]): Link[] {
  const seen = new Set<string>();
  return links.filter((link) => !seen.has(link.url) && seen.add(link.url));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
