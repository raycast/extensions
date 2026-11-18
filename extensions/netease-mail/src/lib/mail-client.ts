import { FetchMessageObject, ImapFlow } from "imapflow";
import { ParsedMail, simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { dateDaysAgo, dateMinutesAgo } from "./date.js";
import { getMailPreferences, MissingMailCredentialsError } from "./preferences.js";
import { htmlToReadableText, makeSnippet, normalizeWhitespace } from "./text.js";

export type MailMessage = {
  uid: number;
  messageId?: string;
  from: string;
  fromAddress?: string;
  to: string;
  subject: string;
  date?: Date;
  seen: boolean;
  snippet: string;
  text: string;
};

export type FetchMailOptions = {
  unreadOnly?: boolean;
  days?: number | null;
  limit?: number;
  offset?: number;
  query?: string;
  mailbox?: string;
};

export type SendMailInput = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
};

export async function fetchMail(options: FetchMailOptions = {}): Promise<MailMessage[]> {
  const preferences = getMailPreferences();
  ensureMailCredentials(preferences);
  const client = createImapClient();
  const days = options.days === null ? null : options.days || preferences.defaultSearchDays;
  const limit = options.limit || 30;
  const offset = options.offset || 0;
  const query = normalizeWhitespace(options.query || "").toLowerCase();

  await client.connect();

  try {
    await sendClientId(client);
    const lock = await client.getMailboxLock(options.mailbox || "INBOX");
    try {
      const searchCriteria: Record<string, unknown> = {};

      if (days !== null) {
        searchCriteria.since = dateDaysAgo(days);
      }

      if (options.unreadOnly) {
        searchCriteria.seen = false;
      }

      const useMailboxOrder = !query && !options.unreadOnly && days === null;

      if (!query && options.unreadOnly && days === null) {
        return await fetchLatestUnreadMessages(client, limit, offset);
      }

      const mailboxExists = getMailboxExists(client);
      const range = useMailboxOrder
        ? getLatestSequenceRange(mailboxExists, limit, offset)
        : await getSearchUidRange(client, searchCriteria, limit, offset);

      if (isEmptyFetchRange(range)) {
        return [];
      }

      const messages: MailMessage[] = [];

      for await (const message of client.fetch(
        range,
        {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
          source: true,
        },
        { uid: !useMailboxOrder },
      )) {
        const mailMessage = await parseFetchedMessage(message);

        if (mailMessage && (!query || matchesQuery(mailMessage, query))) {
          messages.push(mailMessage);
        }

        if (messages.length >= limit) {
          break;
        }
      }

      return messages.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function fetchLatestUnreadMessages(client: ImapFlow, limit: number, offset: number): Promise<MailMessage[]> {
  const uids = await client.search({ seen: false }, { uid: true });
  const unreadUids = [...(uids || [])].sort((a, b) => b - a).slice(offset, offset + limit);

  if (isEmptyFetchRange(unreadUids)) {
    return [];
  }

  const messages: MailMessage[] = [];

  for await (const message of client.fetch(
    unreadUids,
    {
      uid: true,
      envelope: true,
      flags: true,
      internalDate: true,
      source: true,
    },
    { uid: true },
  )) {
    const mailMessage = await parseFetchedMessage(message);
    if (mailMessage) {
      messages.push(mailMessage);
    }
  }

  return messages.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

export async function fetchRecentMail(minutes: number, limit = 25): Promise<MailMessage[]> {
  const client = createImapClient();
  const since = dateMinutesAgo(minutes);

  await client.connect();

  try {
    await sendClientId(client);
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ since }, { uid: true });
      const uidList = uids || [];
      const recentUids = [...uidList].sort((a, b) => b - a).slice(0, Math.max(limit * 4, limit));

      if (isEmptyFetchRange(recentUids)) {
        return [];
      }

      const messages: MailMessage[] = [];
      for await (const message of client.fetch(
        recentUids,
        {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
          source: true,
        },
        { uid: true },
      )) {
        const mailMessage = await parseFetchedMessage(message);
        if (mailMessage && isWithinRecentWindow(mailMessage, since)) {
          messages.push(mailMessage);
        }
      }

      return messages.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, limit);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function markMailAsRead(uid: number): Promise<void> {
  const client = createImapClient();
  await client.connect();

  try {
    await sendClientId(client);
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const preferences = getMailPreferences();
  ensureMailCredentials(preferences);
  const transporter = nodemailer.createTransport({
    host: preferences.smtpHost,
    port: preferences.smtpPort,
    secure: preferences.smtpPort === 465,
    auth: {
      user: preferences.emailAddress,
      pass: preferences.authorizationCode,
    },
  });

  await transporter.sendMail({
    from: preferences.emailAddress,
    to: input.to,
    cc: input.cc || undefined,
    bcc: input.bcc || undefined,
    subject: input.subject,
    text: input.body,
  });
}

function createImapClient(): ImapFlow {
  const preferences = getMailPreferences();
  ensureMailCredentials(preferences);

  return new ImapFlow({
    host: preferences.imapHost,
    port: preferences.imapPort,
    secure: preferences.imapPort === 993,
    auth: {
      user: preferences.emailAddress,
      pass: preferences.authorizationCode,
    },
    logger: false,
  });
}

function ensureMailCredentials(preferences: { emailAddress: string; authorizationCode: string }): void {
  if (!preferences.emailAddress || !preferences.authorizationCode) {
    throw new MissingMailCredentialsError();
  }
}

async function getSearchUidRange(
  client: ImapFlow,
  searchCriteria: Record<string, unknown>,
  limit: number,
  offset: number,
): Promise<number[]> {
  const uids = await client.search(searchCriteria, { uid: true });
  return [...(uids || [])].sort((a, b) => b - a).slice(offset, offset + Math.max(limit * 3, limit));
}

function getLatestSequenceRange(exists: number, limit: number, offset: number): string {
  if (exists <= 0) {
    return "";
  }

  const end = Math.max(1, exists - offset);
  const start = Math.max(1, end - limit + 1);
  return `${start}:${end}`;
}

function getMailboxExists(client: ImapFlow): number {
  const mailbox = client.mailbox as unknown as { exists?: number } | false;
  return mailbox ? mailbox.exists || 0 : 0;
}

function isEmptyFetchRange(range: string | number[]): boolean {
  return range.length === 0;
}

function isWithinRecentWindow(message: MailMessage, since: Date): boolean {
  return Boolean(message.date && message.date.getTime() >= since.getTime());
}

async function parseFetchedMessage(message: FetchMessageObject | false): Promise<MailMessage | undefined> {
  if (!message || !message.source) {
    return undefined;
  }

  const parsed = (await simpleParser(message.source)) as ParsedMail;
  const text = getParsedText(parsed.text, parsed.html);

  return {
    uid: Number(message.uid),
    messageId: parsed.messageId || message.envelope?.messageId,
    from:
      parsed.from?.text ||
      message.envelope?.from?.map((item) => item.name || item.address).join(", ") ||
      "Unknown sender",
    fromAddress: parsed.from?.value?.[0]?.address,
    to: addressText(parsed.to),
    subject: parsed.subject || message.envelope?.subject || "(No subject)",
    date: toDate(message.internalDate || parsed.date),
    seen: message.flags?.has("\\Seen") || false,
    snippet: makeSnippet(text),
    text,
  };
}

async function sendClientId(client: ImapFlow): Promise<void> {
  const maybeClientWithId = client as unknown as {
    id?: unknown;
  };

  if (typeof maybeClientWithId.id !== "function") {
    return;
  }

  const sendId = maybeClientWithId.id as (info: Record<string, string>) => Promise<unknown>;

  await sendId
    .call(client, {
      name: "raycast-netease-mail",
      version: "0.1.0",
      vendor: "raycast-extension",
      contact: "local-extension",
    })
    .catch(() => undefined);
}

function getParsedText(text?: string, html?: string | false): string {
  if (text) {
    return text;
  }

  if (html) {
    return htmlToReadableText(html);
  }

  return "";
}

function addressText(value: ParsedMail["to"]): string {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => item.text).join(", ");
  }

  return value.text;
}

function toDate(value: Date | string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

function matchesQuery(message: MailMessage, query: string): boolean {
  const haystack = [message.subject, message.from, message.fromAddress, message.to, message.snippet, message.text]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return haystack.includes(query);
}
