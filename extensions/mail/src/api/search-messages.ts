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
  return filename.replace(".emlx", "").replace(".partial", "");
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
  id: string;
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
  if (!search && !before && !after && !from) {
    throw new Error("No search options provided");
  }

  const absoluteMessagePaths: string[] = [];

  const persistanceInfo = await getPersistenceInfo();
  const version = persistanceInfo.LastUsedVersionDirectoryName;
  const basePath = resolve(homedir(), `Library/Mail/${version}`);

  const messageIds: number[] = [];

  if (before || after || from) {
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
      LIMIT ${limit};
    `;

    const dbPath = await getDbPath();
    const messages = await executeSQL<{ id: number; mailbox: string }>(dbPath, query);

    if (messages.length === 0) {
      return [];
    }

    for (const message of messages) {
      messageIds.push(message.id);
    }
  }

  const glob = messageIds.length === 0 ? "*.emlx" : `{${messageIds.join(",")}}.{emlx,partial.emlx}`;

  const rgPath = await ensureCLI();

  const { stdout, stderr } = await execa({ reject: false })(rgPath, [
    search || "(.*)",
    "-g",
    glob,
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
    .slice(0, limit);
  const absolutePaths = relativePaths.map((relativePath) => resolve(basePath, relativePath)).slice();
  absoluteMessagePaths.push(...absolutePaths);

  return Promise.all(
    absoluteMessagePaths.map(async (path) => {
      const parsedMessage = await readFile(path, "utf-8").then(parseMessage);
      return { id: getIdFromPath(path), ...parsedMessage };
    }),
  );
}
