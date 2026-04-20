import { ImapFlow, MailboxObject, ListResponse } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { getPreferenceValues } from "@raycast/api";
import { Email, EmailAddress, Folder } from "./types";

const QQ_IMAP_HOST = "imap.qq.com";
const QQ_IMAP_PORT = 993;

function createClient(): ImapFlow {
  const prefs = getPreferenceValues();

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
  try {
    await client.connect();
    return await operation(client);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `IMAP connection failed: ${errorMessage}\n\nPlease verify:\n- Your QQ email address is correct\n- The authorization code is correct (not your QQ password)\n- IMAP service is enabled in QQ Mail Settings`,
    );
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout errors
    }
  }
}

export async function disconnectClient(): Promise<void> {
  // No-op now since we create fresh connections
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

    return folders.sort((a, b) => {
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
  });
}

function parseAddresses(addresses: { name?: string; address?: string }[] | undefined): EmailAddress[] {
  if (!addresses) return [];
  return addresses
    .filter((addr) => addr.address)
    .map((addr) => ({
      name: addr.name,
      address: addr.address!,
    }));
}

interface FetchEmailsOptions {
  folderPath: string;
  limit?: number;
  filter?: "unread" | "read" | "attachment";
  offset?: number;
}

export async function fetchEmails(options: FetchEmailsOptions): Promise<Email[]> {
  const { folderPath, limit = 10, filter, offset = 0 } = options;
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

      // Get the most recent messages with offset for pagination
      const uids = searchResult as number[];
      const sortedUids = uids.sort((a: number, b: number) => b - a);
      const limitedUids = sortedUids.slice(offset, offset + limit);

      const emails: Email[] = [];

      for await (const message of client.fetch(
        limitedUids,
        {
          uid: true,
          flags: true,
          envelope: true,
          bodyStructure: true,
          source: { maxLength: 10000 }, // Fetch partial source for preview
        },
        { uid: true }, // Tell fetch to interpret limitedUids as UIDs, not sequence numbers
      )) {
        const hasAttachment = checkHasAttachment(message.bodyStructure);

        // Skip if filtering by attachment and no attachment
        if (filter === "attachment" && !hasAttachment) {
          continue;
        }

        const envelope = message.envelope;
        const email: Email = {
          uid: message.uid,
          messageId: envelope?.messageId || "",
          subject: envelope?.subject || "(No Subject)",
          from: parseAddresses(envelope?.from as { name?: string; address?: string }[]),
          to: parseAddresses(envelope?.to as { name?: string; address?: string }[]),
          cc: parseAddresses(envelope?.cc as { name?: string; address?: string }[]),
          date: envelope?.date || new Date(),
          flags: message.flags instanceof Set ? [...message.flags] : Array.isArray(message.flags) ? message.flags : [],
          hasAttachment,
          preview: extractPreview(message.source),
        };

        emails.push(email);
      }

      // Sort by date descending
      return emails.sort((a, b) => b.date.getTime() - a.date.getTime());
    } finally {
      lock.release();
    }
  });
}

function checkHasAttachment(bodyStructure: { disposition?: string; childNodes?: unknown[] } | undefined): boolean {
  if (!bodyStructure) return false;

  if (bodyStructure.disposition === "attachment") {
    return true;
  }

  if (bodyStructure.childNodes) {
    for (const child of bodyStructure.childNodes) {
      if (checkHasAttachment(child as { disposition?: string; childNodes?: unknown[] })) {
        return true;
      }
    }
  }

  return false;
}

function extractPreview(source: Buffer | undefined): string {
  if (!source) return "";

  const text = source.toString("utf-8");
  // Try to extract text after headers (double newline)
  const parts = text.split(/\r?\n\r?\n/);
  if (parts.length > 1) {
    const body = parts.slice(1).join(" ");
    // Clean up and truncate
    return body
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 200);
  }
  return "";
}

export async function fetchEmailBody(folderPath: string, uid: number): Promise<{ text?: string; html?: string }> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

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

export async function markAsRead(folderPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

    try {
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function markAsUnread(folderPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

    try {
      await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function deleteEmail(folderPath: string, uid: number): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

    try {
      await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
      await client.messageDelete(uid, { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function moveToFolder(folderPath: string, uid: number, targetFolder: string): Promise<void> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

    try {
      await client.messageMove(uid, targetFolder, { uid: true });
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

export async function fetchAttachments(folderPath: string, uid: number): Promise<Attachment[]> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);

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

export async function archiveEmail(folderPath: string, uid: number): Promise<void> {
  // Try to find Archive folder
  const folders = await listFolders();
  const archiveFolder = folders.find(
    (f) => f.specialUse === "\\Archive" || f.path.toLowerCase() === "archive" || f.name.toLowerCase() === "archive",
  );

  if (archiveFolder) {
    await moveToFolder(folderPath, uid, archiveFolder.path);
  } else {
    throw new Error("Archive folder not found");
  }
}
