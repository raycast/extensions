import { ImapFlow, ListResponse, MessageStructureObject, SearchObject } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Email, EmailAddress, EmailFilter, Folder } from "./types";

// Check if host is localhost (safe for unencrypted local connections)
function isLocalhostHost(host: string): boolean {
  const localhostPatterns = ["127.0.0.1", "localhost", "::1", "0.0.0.0"];
  return localhostPatterns.includes(host.toLowerCase());
}

// Track if we've shown the security warning this session
let securityWarningShown = false;

function createClient(): ImapFlow {
  const prefs = getPreferenceValues<Preferences>();
  const port = parseInt(prefs.imapPort, 10);

  // Warn user if connecting to non-localhost (potential security risk)
  if (!isLocalhostHost(prefs.imapHost) && !securityWarningShown) {
    securityWarningShown = true;
    showToast({
      style: Toast.Style.Failure,
      title: "Security Warning",
      message: `Connecting to non-localhost host "${prefs.imapHost}" may expose your credentials. Proton Mail Bridge should only run on localhost.`,
    });
  }

  return new ImapFlow({
    host: prefs.imapHost,
    port: port,
    secure: false, // Use STARTTLS, not implicit TLS
    auth: {
      user: prefs.username,
      pass: prefs.password,
    },
    tls: {
      rejectUnauthorized: false, // Accept self-signed Bridge certificate
      minVersion: "TLSv1.2",
    },
    logger: false, // Disable logging to prevent sensitive data exposure
  });
}

// Connections stay open for the whole command instead of one per action (a TLS handshake and a login each time).
// imapflow runs one command at a time per connection, so each kind of work gets its own: emails don't wait for
// the counts of every folder, opening an email doesn't wait for a page of the list, and marking, archiving or
// deleting doesn't wait for an email to download.
type Channel = "list" | "folders" | "content" | "actions";

interface ChannelState {
  client: ImapFlow | null;
  connecting: Promise<ImapFlow> | null;
}

const channels: Record<Channel, ChannelState> = {
  list: { client: null, connecting: null },
  folders: { client: null, connecting: null },
  content: { client: null, connecting: null },
  actions: { client: null, connecting: null },
};

// Bumped by disconnectClient(), so a connection that finishes after the command closed logs itself out
let generation = 0;

async function getClient(channel: Channel): Promise<ImapFlow> {
  const state = channels[channel];
  if (state.client?.usable) return state.client;
  if (!state.connecting) {
    const startedIn = generation;
    state.connecting = (async () => {
      const client = createClient();
      // Without a listener, a dropped connection would crash the command; the next call reconnects instead
      client.on("error", () => {});
      client.on("close", () => {
        if (state.client === client) state.client = null;
      });
      await client.connect();
      if (startedIn !== generation) {
        await client.logout().catch(() => undefined);
        throw new Error("Command closed while connecting");
      }
      state.client = client;
      return client;
    })().finally(() => {
      state.connecting = null;
    });
  }
  return state.connecting;
}

export type BridgeErrorReason = "unreachable" | "authentication";

// Raised when Bridge can't be reached or rejects the credentials, so the views can say what to do
// instead of showing an empty folder
class BridgeError extends Error {
  constructor(readonly reason: BridgeErrorReason) {
    super(
      reason === "unreachable"
        ? "Can't reach Proton Mail Bridge"
        : "Proton Mail Bridge rejected the username or password",
    );
    this.name = "BridgeError";
  }
}

function toBridgeError(error: unknown): BridgeError | undefined {
  const { code, authenticationFailed } = (error ?? {}) as { code?: string; authenticationFailed?: boolean };
  // Nothing listens on the configured port: Bridge isn't running, or it uses another host or port
  if (code === "ECONNREFUSED") return new BridgeError("unreachable");
  if (authenticationFailed) return new BridgeError("authentication");
  return undefined;
}

export function bridgeErrorReason(error: unknown): BridgeErrorReason | undefined {
  return error instanceof Error && error.name === "BridgeError" ? (error as BridgeError).reason : undefined;
}

export type BridgeStatus = "ready" | BridgeErrorReason | "failed";

// Logs in without loading anything, so the views can tell whether Bridge is up. The connection stays open for the
// list that loads next.
export async function checkBridge(): Promise<BridgeStatus> {
  try {
    return await withClient(async () => "ready" as const, "list");
  } catch (error) {
    return bridgeErrorReason(error) ?? "failed";
  }
}

// Bridge can drop a connection at any time, for example while it starts up and syncs, or when it restarts.
// imapflow then rejects the pending command with one of these codes.
const CONNECTION_LOST_CODES = new Set([
  "NoConnection",
  "EConnectionClosed",
  "ClosedAfterConnectText",
  "ClosedAfterConnectTLS",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

function isConnectionLost(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && CONNECTION_LOST_CODES.has(code);
}

function dropConnection(channel: Channel) {
  const state = channels[channel];
  const client = state.client;
  state.client = null;
  client?.close();
}

async function withClient<T>(operation: (client: ImapFlow) => Promise<T>, channel: Channel = "actions"): Promise<T> {
  try {
    try {
      return await operation(await getClient(channel));
    } catch (error) {
      if (!isConnectionLost(error)) throw error;
      // Retry once on a fresh connection instead of surfacing the drop. Operations are reads or flag changes;
      // a move that went through just before the drop fails the retry, since the email has already left the folder.
      dropConnection(channel);
      return await operation(await getClient(channel));
    }
  } catch (error) {
    const bridgeError = toBridgeError(error);
    if (bridgeError) throw bridgeError;

    const prefs = getPreferenceValues<Preferences>();
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `IMAP connection failed: ${errorMessage}\n\nPlease verify:\n- Proton Mail Bridge is running\n- Host: ${prefs.imapHost}, Port: ${prefs.imapPort}\n- Username and password are correct (use Bridge password, not Proton account password)`,
    );
  }
}

// Runs `operation` with the folder selected
async function withMailbox<T>(
  folderPath: string,
  operation: (client: ImapFlow) => Promise<T>,
  channel: Channel = "actions",
): Promise<T> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(folderPath);
    try {
      return await operation(client);
    } finally {
      lock.release();
    }
  }, channel);
}

// Views hold the connections while they're mounted, and they close once the last view lets go. Closing is delayed
// so a view that unmounts and mounts again right away (React does this in development) keeps the connections
// and the loads already in flight, instead of having them cut off as if the command had closed.
const CLOSE_DELAY_MS = 1000;
let holders = 0;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

export function holdConnections(): () => void {
  holders += 1;
  clearTimeout(closeTimer);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) {
      closeTimer = setTimeout(() => void disconnectClient(), CLOSE_DELAY_MS);
    }
  };
}

async function disconnectClient(): Promise<void> {
  generation += 1;
  await Promise.all(
    Object.values(channels).map(async (state) => {
      const client = state.client;
      state.client = null;
      if (client) {
        await client.logout().catch(() => undefined);
      }
    }),
  );
}

export async function listFolders({ withCounts = false }: { withCounts?: boolean } = {}): Promise<Folder[]> {
  return withClient(
    async (client) => {
      const list: ListResponse[] = await client.list(
        withCounts ? { statusQuery: { messages: true, unseen: true } } : undefined,
      );

      const folders: Folder[] = list.map((item) => ({
        path: item.path,
        name: item.name,
        delimiter: item.delimiter,
        flags: Array.from(item.flags ?? []),
        specialUse: item.specialUse,
        messagesCount: item.status?.messages,
        unseenCount: item.status?.unseen,
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
      // Counts need a STATUS per folder, so they get their own connection. A plain list is quick and serves actions
      // (finding Trash or Archive), which shouldn't wait for the counts.
    },
    withCounts ? "folders" : "actions",
  );
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

export interface EmailPage {
  filter: EmailFilter;
  // Searched in the subject and the sender
  query?: string;
  offset: number;
  limit: number;
}

// A page of a folder's emails, newest first
export async function fetchEmails(folderPath: string, { filter, query, offset, limit }: EmailPage): Promise<Email[]> {
  return withMailbox(
    folderPath,
    async (client) => {
      if (!client.mailbox || client.mailbox.exists === 0) return [];

      // Later pages reuse the order computed for the first one instead of fetching every date again
      const order = await getFolderOrder(client, folderPath, filter, query, offset === 0);
      const pageSource = () => (filter === "attachment" ? order.attachmentMatches : order.uids);
      const emails: Email[] = [];

      // Emails deleted or moved since the order was computed come back missing. Drop them from the order
      // (they sit at or after `offset`, so earlier pages keep their positions) and fill the page with the next ones,
      // so a short page doesn't look like the end of the folder.
      for (;;) {
        if (filter === "attachment") {
          await scanForAttachments(client, order, offset + limit);
        }
        const wanted = pageSource().slice(offset + emails.length, offset + limit);
        if (wanted.length === 0) break;

        const fetched = await fetchEmailsByUid(client, wanted);
        emails.push(...fetched);
        const found = new Set(fetched.map((email) => email.uid));
        const missing = new Set(wanted.filter((uid) => !found.has(uid)));
        if (missing.size === 0) break;

        order.scanned -= order.uids.slice(0, order.scanned).filter((uid) => missing.has(uid)).length;
        order.uids = order.uids.filter((uid) => !missing.has(uid));
        order.attachmentMatches = order.attachmentMatches.filter((uid) => !missing.has(uid));
      }

      // Sort by date descending, like the page order
      return emails.sort((a, b) => b.date.getTime() - a.date.getTime() || b.uid - a.uid);
    },
    "list",
  );
}

async function fetchEmailsByUid(client: ImapFlow, uids: number[]): Promise<Email[]> {
  const emails: Email[] = [];
  for await (const message of client.fetch(
    uids,
    {
      uid: true,
      flags: true,
      internalDate: true,
      envelope: true,
      bodyStructure: true,
      headers: ["x-pm-internal-id"],
    },
    { uid: true }, // Tell fetch to interpret uids as UIDs, not sequence numbers
  )) {
    const envelope = message.envelope;
    emails.push({
      uid: message.uid,
      messageId: envelope?.messageId || "",
      subject: envelope?.subject || "(No Subject)",
      from: parseAddresses(envelope?.from as { name?: string; address?: string }[]),
      to: parseAddresses(envelope?.to as { name?: string; address?: string }[]),
      cc: parseAddresses(envelope?.cc as { name?: string; address?: string }[]),
      // Same date as the page order: Bridge's internal date is the Proton message time the web app shows
      date: toDate(message.internalDate) ?? envelope?.date ?? new Date(),
      flags: Array.from(message.flags ?? []),
      hasAttachment: checkHasAttachment(message.bodyStructure),
      protonId: extractProtonId(message.headers),
    });
  }
  return emails;
}

function toDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// UIDs of a folder (for one filter and search) sorted newest first, plus how far the attachment scan has gone
interface FolderOrder {
  uids: number[];
  attachmentMatches: number[];
  scanned: number;
}

const folderOrders = new Map<string, FolderOrder>();

async function getFolderOrder(
  client: ImapFlow,
  folderPath: string,
  filter: EmailFilter,
  query: string | undefined,
  fresh: boolean,
): Promise<FolderOrder> {
  const searchText = query?.trim();
  const key = [folderPath, filter, searchText ?? ""].join("\u0000");
  const cached = folderOrders.get(key);
  if (cached && !fresh) return cached;

  let searchQuery: SearchObject = { all: true };
  if (filter === "unread") {
    searchQuery = { seen: false };
  } else if (filter === "read") {
    searchQuery = { seen: true };
  }
  if (searchText) {
    searchQuery.or = [{ subject: searchText }, { from: searchText }];
  }
  const searchResult = (await client.search(searchQuery, { uid: true })) || [];

  // UIDs follow the order messages were added to the mailbox (Bridge sync, moves), not their date,
  // so sort on the internal date before picking pages
  const datedUids: { uid: number; time: number }[] = [];
  if (searchResult.length > 0) {
    for await (const message of client.fetch(searchResult, { uid: true, internalDate: true }, { uid: true })) {
      datedUids.push({ uid: message.uid, time: toDate(message.internalDate)?.getTime() ?? 0 });
    }
  }
  datedUids.sort((a, b) => b.time - a.time || b.uid - a.uid);

  const order = { uids: datedUids.map(({ uid }) => uid), attachmentMatches: [], scanned: 0 };
  folderOrders.set(key, order);
  return order;
}

// IMAP has no standard search key for attachments, so scan body structures newest first, in chunks,
// until there are enough matches to fill the requested page. The scan resumes where the last page stopped.
async function scanForAttachments(client: ImapFlow, order: FolderOrder, needed: number): Promise<void> {
  const CHUNK_SIZE = 100;

  while (order.attachmentMatches.length < needed && order.scanned < order.uids.length) {
    const chunk = order.uids.slice(order.scanned, order.scanned + CHUNK_SIZE);
    const withAttachment = new Set<number>();
    for await (const message of client.fetch(chunk, { uid: true, bodyStructure: true }, { uid: true })) {
      if (checkHasAttachment(message.bodyStructure)) withAttachment.add(message.uid);
    }
    order.attachmentMatches.push(...chunk.filter((uid) => withAttachment.has(uid)));
    order.scanned += chunk.length;
  }
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

function extractProtonId(headers: Buffer | undefined): string | undefined {
  if (!headers) return undefined;
  // Unfold continuation lines before matching
  const text = headers.toString("utf-8").replace(/\r?\n[ \t]+/g, " ");
  return text.match(/^x-pm-internal-id:\s*(\S+)/im)?.[1];
}

type BodyPart = { part: string; charset?: string };

// Find the displayable text and HTML parts, skipping attachments and forwarded messages
function findBodyParts(
  node: MessageStructureObject | undefined,
  found: { text?: BodyPart; html?: BodyPart } = {},
): { text?: BodyPart; html?: BodyPart } {
  if (!node) return found;
  const type = node.type?.toLowerCase();

  if (node.childNodes?.length) {
    if (type !== "message/rfc822") {
      for (const child of node.childNodes) findBodyParts(child, found);
    }
    return found;
  }

  // A text part named like a file (an attached .txt or .html) is an attachment even without that disposition
  const paramNames = Object.keys({ ...node.parameters, ...node.dispositionParameters });
  const isNamedFile = paramNames.some((name) => /^(?:file)?name\*?$/.test(name));
  if (node.disposition === "attachment" || isNamedFile) return found;
  // A single-part message has no part number; IMAP addresses its body as part 1
  const bodyPart = { part: node.part || "1", charset: node.parameters?.charset };
  if (type === "text/plain" && !found.text) found.text = bodyPart;
  if (type === "text/html" && !found.html) found.html = bodyPart;
  return found;
}

function decodePart(content: Buffer | null | undefined, charset?: string): string | undefined {
  if (!content) return undefined;
  try {
    return new TextDecoder(charset || "utf-8").decode(content);
  } catch {
    // Unknown charset label
    return new TextDecoder("utf-8").decode(content);
  }
}

export interface EmailBody {
  text?: string;
  html?: string;
}

// Recently opened bodies, so moving through the list or expanding the selected email doesn't download them
// again. Memory only: bodies are decrypted emails and must not be written to disk.
const BODY_CACHE_SIZE = 20;
const bodyCache = new Map<string, EmailBody>();

function bodyCacheKey(folderPath: string, uid: number): string {
  return `${folderPath}\u0000${uid}`;
}

// The body if it's already in memory, so a view can show it right away
export function cachedEmailBody(folderPath: string, uid: number): EmailBody | undefined {
  const key = bodyCacheKey(folderPath, uid);
  const cached = bodyCache.get(key);
  if (cached) {
    // Most recently used last, so the oldest entry is the first one dropped
    bodyCache.delete(key);
    bodyCache.set(key, cached);
  }
  return cached;
}

// The text and HTML of an email, without its attachments: downloading the full source used to fetch several MB
// for a short email with a few photos
//
// With `signal`, a download that hasn't started when the signal aborts is skipped: moving through the list with the
// preview open asks for every email on the way, and only the one still selected is worth downloading.
export async function fetchEmailBody(folderPath: string, uid: number, signal?: AbortSignal): Promise<EmailBody> {
  const cached = cachedEmailBody(folderPath, uid);
  if (cached) return cached;

  const body = await withMailbox(
    folderPath,
    async (client): Promise<EmailBody | undefined> => {
      if (signal?.aborted) return undefined;
      const message = await client.fetchOne(uid, { bodyStructure: true }, { uid: true });
      const { text, html } = findBodyParts(message ? message.bodyStructure : undefined);
      const parts = [text, html].filter((part): part is BodyPart => !!part).map(({ part }) => part);
      if (parts.length === 0) return {};

      const downloaded = await client.downloadMany(String(uid), parts, { uid: true });
      const decode = (bodyPart?: BodyPart) =>
        bodyPart &&
        decodePart(downloaded[bodyPart.part]?.content, downloaded[bodyPart.part]?.meta?.charset || bodyPart.charset);
      return { text: decode(text), html: decode(html) };
    },
    "content",
  );
  // Skipped: the view that asked is gone. useEmailBody's usePromise ignores this AbortError.
  if (!body) throw signal?.reason ?? new DOMException("Aborted", "AbortError");

  bodyCache.set(bodyCacheKey(folderPath, uid), body);
  if (bodyCache.size > BODY_CACHE_SIZE) bodyCache.delete(bodyCache.keys().next().value as string);
  return body;
}

// The HTML of an email with its inline images embedded, for opening the original in the browser.
// Undefined for plain text emails.
export async function fetchOriginalHtml(folderPath: string, uid: number): Promise<string | undefined> {
  return withMailbox(
    folderPath,
    async (client) => {
      // Check there is an HTML version before downloading the whole message for it
      const structure = await client.fetchOne(uid, { bodyStructure: true }, { uid: true });
      if (!structure || !findBodyParts(structure.bodyStructure).html) return undefined;

      // The inline images live in other parts of the message, so this needs the full source
      const message = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!message || !message.source) return undefined;
      const parsed: ParsedMail = await simpleParser(message.source, {
        skipHtmlToText: true,
        skipTextToHtml: true,
        skipTextLinks: true,
      });
      return parsed.html || undefined;
    },
    "content",
  );
}

export async function setRead(folderPath: string, uid: number, read: boolean): Promise<void> {
  await withMailbox(folderPath, async (client) => {
    if (read) await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    else await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
  });
}

function findSpecialFolder(folders: Folder[], specialUse: string, name: string): Folder | undefined {
  return folders.find((folder) => folder.specialUse === specialUse || folder.path.toLowerCase() === name);
}

// By special-use attribute, or by Bridge's name for it while the folder list hasn't loaded yet
function isSpecialFolder(folderPath: string, folders: Folder[] | undefined, specialUse: string, name: string) {
  const special = folders && findSpecialFolder(folders, specialUse, name);
  return special ? special.path === folderPath : folderPath.toLowerCase() === name;
}

// Bridge only deletes emails for good when they're removed from Trash or Drafts. Removing one from any
// other folder doesn't send it to Trash: it either loses its folder (left only in All Mail) or stays put.
export function deletesPermanently(folderPath: string, folders: Folder[] | undefined): boolean {
  return (
    isSpecialFolder(folderPath, folders, "\\Trash", "trash") ||
    isSpecialFolder(folderPath, folders, "\\Drafts", "drafts")
  );
}

export function isArchiveFolder(folderPath: string, folders: Folder[] | undefined): boolean {
  return isSpecialFolder(folderPath, folders, "\\Archive", "archive");
}

// All Mail holds every email, so one that was archived or moved to Trash can still be in it
export function holdsEverything(folderPath: string, folders: Folder[] | undefined): boolean {
  return isSpecialFolder(folderPath, folders, "\\All", "all mail");
}

// Moves the email to Trash, or deletes it for good when it's already in Trash or Drafts
export async function deleteEmail(folderPath: string, uid: number): Promise<"trashed" | "deleted"> {
  const folders = await listFolders();

  if (deletesPermanently(folderPath, folders)) {
    await withMailbox(folderPath, (client) => client.messageDelete(uid, { uid: true }));
    return "deleted";
  }

  const trashFolder = findSpecialFolder(folders, "\\Trash", "trash");
  if (!trashFolder) {
    throw new Error("Trash folder not found");
  }
  await moveToFolder(folderPath, uid, trashFolder.path);
  return "trashed";
}

async function moveToFolder(folderPath: string, uid: number, targetFolder: string): Promise<void> {
  await withMailbox(folderPath, (client) => client.messageMove(uid, targetFolder, { uid: true }));
}

export interface Attachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export async function fetchAttachments(folderPath: string, uid: number): Promise<Attachment[]> {
  return withMailbox(
    folderPath,
    async (client) => {
      const message = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!message || !message.source) {
        return [];
      }

      const parsed: ParsedMail = await simpleParser(message.source);
      return parsed.attachments.map((attachment, index) => ({
        filename: attachment.filename || `attachment-${index + 1}`,
        contentType: attachment.contentType,
        content: attachment.content,
      }));
    },
    "content",
  );
}

export async function archiveEmail(folderPath: string, uid: number): Promise<void> {
  const archiveFolder = findSpecialFolder(await listFolders(), "\\Archive", "archive");
  if (!archiveFolder) {
    throw new Error("Archive folder not found");
  }
  await moveToFolder(folderPath, uid, archiveFolder.path);
}
