import { ImapFlow, MailboxObject, ListResponse } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { getPreferenceValues } from "@raycast/api";
import { Email, Folder } from "./types";
import { buildEmailFromMessage, checkHasAttachment, checkIsArchive } from "./utils";

const QQ_IMAP_HOST = "imap.qq.com";
const QQ_IMAP_PORT = 993;

function createClient(): ImapFlow {
  const prefs = getPreferenceValues<Preferences>();

  return new ImapFlow({
    host: QQ_IMAP_HOST,
    port: QQ_IMAP_PORT,
    secure: true,
    auth: {
      user: prefs.username,
      pass: prefs.password,
    },
    logger: false,
  });
}

async function withClient<T>(operation: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = createClient();
  let connected = false;
  try {
    try {
      await client.connect();
      connected = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `IMAP connection failed: ${errorMessage}\n\nPlease verify:\n- Your QQ email address is correct\n- The authorization code is correct (not your QQ password)\n- IMAP service is enabled in QQ Mail Settings`,
      );
    }

    return await operation(client);
  } finally {
    if (connected) {
      try {
        await client.logout();
      } catch {
        // Ignore logout errors
      }
    }
  }
}

export async function listFolders(): Promise<Folder[]> {
  return withClient(async (client) => {
    const list: ListResponse[] = await client.list();

    const folders: Folder[] = list.map((item) => ({
      path: item.path,
      name: item.name,
      delimiter: item.delimiter,
      flags: item.flags instanceof Set ? [...item.flags] : Array.isArray(item.flags) ? item.flags : [],
      specialUse: item.specialUse,
    }));

    // Sort folders: special folders first, then alphabetically
    const specialOrder = ["\\Inbox", "\\Drafts", "\\Sent", "\\Archive", "\\Trash", "\\Junk"];

    const sorted = folders.sort((a, b) => {
      const aSpecial = specialOrder.indexOf(a.specialUse || "");
      const bSpecial = specialOrder.indexOf(b.specialUse || "");

      if (aSpecial !== -1 && bSpecial !== -1) return aSpecial - bSpecial;
      if (aSpecial !== -1) return -1;
      if (bSpecial !== -1) return 1;

      // INBOX always first if no specialUse
      if (a.path.toUpperCase() === "INBOX") return -1;
      if (b.path.toUpperCase() === "INBOX") return 1;

      return a.name.localeCompare(b.name);
    });

    // Inject virtual "Starred" folder after Inbox (QQ Mail starred = \Flagged flag)
    const starredFolder: Folder = {
      path: "__starred__",
      name: "Starred",
      delimiter: "/",
      flags: [],
      specialUse: "\\Flagged",
    };
    const inboxIndex = sorted.findIndex((f) => f.path.toUpperCase() === "INBOX");
    sorted.splice(inboxIndex + 1, 0, starredFolder);

    return sorted;
  });
}

interface FetchEmailsOptions {
  folderPath: string;
  limit?: number;
  filter?: "unread" | "read" | "attachment";
  offset?: number;
}

async function fetchStarredEmailsFromFolder(folderPath: string): Promise<Email[]> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);
    try {
      const mailbox: MailboxObject | false = client.mailbox;
      if (!mailbox || mailbox.exists === 0) return [];

      const searchResult = await client.search({ flagged: true }, { uid: true });
      if (!searchResult || searchResult.length === 0) return [];

      const uids = (searchResult as number[]).sort((a, b) => b - a);
      const folderEmails: Email[] = [];

      const msgList = client.fetch(
        uids,
        { uid: true, flags: true, envelope: true, bodyStructure: true, source: { maxLength: 10000 } },
        { uid: true },
      );
      for await (const message of msgList) {
        folderEmails.push(buildEmailFromMessage(folderPath, message));
      }
      return folderEmails;
    } finally {
      lock.release();
    }
  });
}

export async function fetchStarredEmails(limit: number = 50, offset: number = 0): Promise<Email[]> {
  const folders = await listFolders();
  const realFolders = folders.filter((f) => f.path !== "__starred__");

  const allStarred: Email[] = [];
  for (const folder of realFolders) {
    allStarred.push(...(await fetchStarredEmailsFromFolder(folder.path)));
  }

  return allStarred.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(offset, offset + limit);
}

export async function fetchEmails(options: FetchEmailsOptions): Promise<Email[]> {
  const { folderPath, limit = 10, filter, offset = 0 } = options;

  if (folderPath === "__starred__") {
    return fetchStarredEmails(limit, offset);
  }

  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

    try {
      const mailbox: MailboxObject | false = client.mailbox;
      if (!mailbox || mailbox.exists === 0) {
        return [];
      }

      // Build search query based on filter
      let searchQuery: { all?: boolean; seen?: boolean } = { all: true };
      if (filter === "unread") {
        searchQuery = { seen: false };
      } else if (filter === "read") {
        searchQuery = { seen: true };
      }

      // Search for messages
      const searchResult = await client.search(searchQuery, { uid: true });
      if (!searchResult || searchResult.length === 0) {
        return [];
      }

      // Sort UIDs descending (newest first)
      const sortedUids = (searchResult as number[]).sort((a, b) => b - a);

      const emails: Email[] = [];

      if (filter === "attachment") {
        // For attachment filter: scan UIDs in batches until we collect `limit` matching emails,
        // starting from `offset` matching emails. This avoids premature pagination termination
        // that would occur if we sliced UIDs first and then discarded non-attachment emails.
        const batchSize = Math.max(limit * 3, 60);
        let scanned = 0;
        let matched = 0;

        while (scanned < sortedUids.length && emails.length < limit) {
          const batchUids = sortedUids.slice(scanned, scanned + batchSize);
          scanned += batchSize;

          const messages = client.fetch(
            batchUids,
            { uid: true, flags: true, envelope: true, bodyStructure: true, source: { maxLength: 10000 } },
            { uid: true },
          );
          for await (const message of messages) {
            const hasAttachment = checkHasAttachment(message.bodyStructure);
            if (!hasAttachment) continue;

            matched++;
            if (matched <= offset) continue; // skip emails before the current page offset

            emails.push(buildEmailFromMessage(folderPath, message));

            if (emails.length >= limit) break;
          }
        }
      } else {
        // For non-attachment filters: slice UIDs directly for O(1) pagination
        const limitedUids = sortedUids.slice(offset, offset + limit);

        const msgList = client.fetch(
          limitedUids,
          { uid: true, flags: true, envelope: true, bodyStructure: true, source: { maxLength: 10000 } },
          { uid: true },
        );
        for await (const message of msgList) {
          emails.push(buildEmailFromMessage(folderPath, message));
        }
      }

      // Sort by date descending
      return emails.sort((a, b) => b.date.getTime() - a.date.getTime());
    } finally {
      lock.release();
    }
  });
}

export async function fetchEmailBody(mailboxPath: string, uid: number): Promise<{ text?: string; html?: string }> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);

    try {
      const message = await client.fetchOne(
        uid,
        {
          source: true,
        },
        { uid: true },
      );

      if (!message || !message.source) {
        return {};
      }

      const parsed: ParsedMail = await simpleParser(message.source as Buffer);

      return {
        text: parsed.text,
        html: parsed.html || undefined,
      };
    } finally {
      lock.release();
    }
  });
}

export async function starEmail(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);
    try {
      await client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function unstarEmail(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);
    try {
      await client.messageFlagsRemove(uid, ["\\Flagged"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function markAsRead(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);

    try {
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function markAsUnread(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);

    try {
      await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function deleteEmail(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);

    try {
      await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
      await client.messageDelete(uid, { uid: true });
    } finally {
      lock.release();
    }
  });
}

export interface Attachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export async function fetchAttachments(mailboxPath: string, uid: number): Promise<Attachment[]> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(mailboxPath);

    try {
      const message = await client.fetchOne(
        uid,
        {
          source: true,
        },
        { uid: true },
      );

      if (!message || !message.source) {
        return [];
      }

      const parsed: ParsedMail = await simpleParser(message.source as Buffer);
      const attachments: Attachment[] = [];

      if (parsed.attachments) {
        for (const att of parsed.attachments) {
          attachments.push({
            filename: att.filename || `attachment-${attachments.length + 1}`,
            contentType: att.contentType,
            content: att.content,
          });
        }
      }

      return attachments;
    } finally {
      lock.release();
    }
  });
}

export async function archiveEmail(mailboxPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    // Find archive folder within the same connection
    const list = await client.list();
    const archiveFolder = list.find((f) => checkIsArchive(f));

    if (!archiveFolder) {
      throw new Error("Archive folder not found");
    }

    const lock = await client.getMailboxLock(mailboxPath);
    try {
      await client.messageMove(uid, archiveFolder.path, { uid: true });
    } finally {
      lock.release();
    }
  });
}
