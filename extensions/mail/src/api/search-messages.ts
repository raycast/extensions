import { execa } from "execa";
import { homedir } from "os";
import { resolve } from "path";
import { simpleParser } from "mailparser";
import { readFile } from "fs/promises";
import { executeSQL } from "@raycast/utils";
import { basename } from "path/posix";

import { getPersistenceInfo } from "./get-persistence-info";
import { ensureCLI } from "../utils/ripgrep";
import { getDbPath } from "../utils/constants";

const toUnixTimestamp = (date: string) => {
  return new Date(date).getTime() / 1000;
};

/**
 * Parses an Apple Mail .emlx file by removing the byte count at the beginning
 * and the plist at the end, then extracting the email text content.
 */
async function parseMessage(message: string) {
  const lines = message.split("\n");
  lines.shift(); // remove the first line containing the byte count
  const emailContent = lines.join("\n");
  const plistStartIndex = emailContent.lastIndexOf("<?xml");
  const emailOnly = plistStartIndex !== -1 ? emailContent.substring(0, plistStartIndex) : emailContent;

  const parsed = await simpleParser(emailOnly);

  return {
    from: parsed.from?.value[0].address || "",
    subject: parsed.subject || "",
    text: parsed.text || "",
  };
}

const getIdFromPath = (path: string) => {
  const filename = basename(path);
  return parseInt(filename.replace(".emlx", "").replace(".partial", ""));
};

type SearchOptions = {
  search: string;
  before: string;
  after: string;
  from: string;
  order: "asc" | "desc";
  limit: number;
};

type Message = {
  id: number;
  from: string;
  subject: string;
  text: string;
};

export async function searchMessages({
  search,
  before,
  after,
  from,
  order = "desc",
  limit = 25,
}: Partial<SearchOptions>): Promise<Message[]> {
  const persistenceInfo = await getPersistenceInfo();
  const version = persistenceInfo.LastUsedVersionDirectoryName;
  const basePath = resolve(homedir(), `Library/Mail/${version}`);

  const rgPath = await ensureCLI();

  const filters: string[] = [];

  if (before) {
    filters.push(`messages.date_sent < ${toUnixTimestamp(before)}`);
  }

  if (after) {
    filters.push(`messages.date_sent > ${toUnixTimestamp(after)}`);
  }

  if (from) {
    filters.push(`addresses.address = "${from}"`);
  }

  const query = `
    SELECT messages.ROWID as id
    FROM messages
    LEFT JOIN addresses ON addresses.ROWID = messages.sender
    LEFT JOIN subjects ON messages.subject = subjects.ROWID
    LEFT JOIN summaries ON messages.summary = summaries.ROWID
    LEFT JOIN mailboxes ON messages.mailbox = mailboxes.ROWID
    ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
    ORDER BY messages.date_sent ${order}
    ${search ? "" : `LIMIT ${limit}`};
  `;

  const dbPath = await getDbPath();
  const messages = await executeSQL<{ id: number; mailbox: string }>(dbPath, query);
  const messageIds = messages.map((message) => message.id);

  if (messages.length === 0) {
    return [];
  }

  const { stdout, stderr } = await execa({ reject: false })(rgPath, [
    search || "(.*)",
    "-g",
    search ? "*.emlx" : `{${messageIds.join(",")}}.{emlx,partial.emlx}`,
    "-i", // case insensitive
    "-l", // only output file names
    basePath,
  ]);

  if (stderr) {
    throw new Error("Error searching messages");
  }

  const relativePaths = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => {
      const id = getIdFromPath(path);
      return !messageIds[id];
    })
    .toSorted((a, b) => {
      const aId = getIdFromPath(a);
      const bId = getIdFromPath(b);
      return messageIds.indexOf(aId) - messageIds.indexOf(bId);
    })
    .slice(0, limit);

  const absolutePaths = relativePaths.map((relativePath) => resolve(basePath, relativePath));

  return Promise.all(
    absolutePaths.map(async (path) => {
      const parsedMessage = await readFile(path, "utf-8").then(parseMessage);
      return { id: getIdFromPath(path), ...parsedMessage };
    }),
  );
}
