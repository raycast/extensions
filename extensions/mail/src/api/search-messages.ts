import { execa } from "execa";
import { homedir } from "os";
import { resolve } from "path";
import { readFile } from "fs/promises";
import { executeSQL } from "@raycast/utils";
import { basename } from "path/posix";

import { getDatabasePath, getPersistenceInfo } from "./get-persistence-info";
import { ensureCLI } from "../utils/ripgrep";
import { parseMessage } from "../utils/parse-message";
import { translateMailboxName } from "../utils/mailbox";

const toUnixTimestamp = (date: string) => {
  return new Date(date).getTime() / 1000;
};

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
  includeTrash: boolean;
};

const isTrashPath = (path: string) => {
  return path
    .split("/")
    .some(
      (part) => part.toLowerCase().endsWith(".mbox") && translateMailboxName(part.replace(/\.mbox$/i, "")) === "trash",
    );
};

const trashMailboxGlobs = [
  "!**/Trash.mbox/**",
  "!**/Bin.mbox/**",
  "!**/Deleted Items.mbox/**",
  "!**/Deleted Mail.mbox/**",
  "!**/Deleted Messages.mbox/**",
];

export async function searchMessages({
  search,
  before,
  after,
  from,
  order = "desc",
  limit = 25,
  includeTrash = false,
}: Partial<SearchOptions>) {
  const persistenceInfo = await getPersistenceInfo();
  const version = persistenceInfo.LastUsedVersionDirectoryName;
  const basePath = resolve(homedir(), `Library/Mail/${version}`);
  const resultLimit = Math.min(limit, 50);
  const candidateLimit = includeTrash ? resultLimit : resultLimit * 10;

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
    ${search ? "" : `LIMIT ${candidateLimit}`};
  `;

  const databasePath = await getDatabasePath();
  const messages = await executeSQL<{ id: number }>(databasePath, query);
  const messageIds = messages.map((message) => message.id);

  if (messages.length === 0) {
    return [];
  }

  const { stdout, stderr } = await execa({ reject: false })(rgPath, [
    search || "(.*)",
    "-g",
    search ? "*.emlx" : `{${messageIds.join(",")}}.{emlx,partial.emlx}`,
    ...(!includeTrash ? trashMailboxGlobs.flatMap((glob) => ["-g", glob]) : []),
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
      return messageIds.includes(id);
    })
    .filter((path) => includeTrash || !isTrashPath(path))
    .toSorted((a, b) => {
      const aId = getIdFromPath(a);
      const bId = getIdFromPath(b);
      return messageIds.indexOf(aId) - messageIds.indexOf(bId);
    })
    .slice(0, resultLimit);

  const absolutePaths = relativePaths.map((relativePath) => resolve(basePath, relativePath));

  return Promise.all(
    absolutePaths.map(async (path) => {
      const { from, subject, text } = await readFile(path, "utf-8").then(parseMessage);

      return {
        id: getIdFromPath(path),
        filePath: path,
        from,
        subject,
        summary: text.substring(0, Math.min(text.length, 100)),
      };
    }),
  );
}
