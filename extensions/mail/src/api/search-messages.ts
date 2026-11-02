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
  const timestamp = new Date(date).getTime() / 1000;
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date format: "${date}". Expected format: YYYY-MM-DD HH:mm`);
  }
  return timestamp;
};

const toSqlStringLiteral = (value: string) => `'${value.replaceAll("'", "''")}'`;

const getIdFromPath = (path: string) => {
  const filename = basename(path);
  return parseInt(filename.replace(".emlx", "").replace(".partial", ""));
};

type SearchOptions = {
  search: string;
  before: string;
  after: string;
  from: string;
  mailbox: "inbox";
  order: "asc" | "desc";
  limit: number;
  offset: number;
  includeTrash: boolean;
  includeBody: boolean;
};

const isTrashPath = (path: string) => {
  return path
    .split("/")
    .some(
      (part) => part.toLowerCase().endsWith(".mbox") && translateMailboxName(part.replace(/\.mbox$/i, "")) === "trash",
    );
};

const isMailboxPath = (path: string, mailbox: NonNullable<SearchOptions["mailbox"]>) => {
  const mailboxDirectory = path
    .split("/")
    .filter((part) => part.toLowerCase().endsWith(".mbox"))
    .at(-1);

  return mailboxDirectory !== undefined && translateMailboxName(mailboxDirectory.replace(/\.mbox$/i, "")) === mailbox;
};

const trashMailboxGlobs = [
  "!**/Trash.mbox/**",
  "!**/Bin.mbox/**",
  "!**/Deleted Items.mbox/**",
  "!**/Deleted Mail.mbox/**",
  "!**/Deleted Messages.mbox/**",
];
const CANDIDATE_BATCH_SIZE = 200;

export async function searchMessages({
  search,
  before,
  after,
  from,
  mailbox,
  order = "desc",
  limit = 25,
  offset = 0,
  includeTrash = false,
  includeBody = false,
}: Partial<SearchOptions>) {
  if (order !== "asc" && order !== "desc") {
    throw new Error("Order must be 'asc' or 'desc'");
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer");
  }

  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) {
    throw new Error("Offset must be an integer between 0 and 10000");
  }

  if (mailbox && mailbox !== "inbox") {
    throw new Error("Only Inbox mailbox filtering is supported");
  }

  const persistenceInfo = await getPersistenceInfo();
  const version = persistenceInfo.LastUsedVersionDirectoryName;
  const basePath = resolve(homedir(), `Library/Mail/${version}`);
  const resultLimit = Math.min(limit, 50);

  const rgPath = await ensureCLI();

  const filters: string[] = [];

  if (before) {
    filters.push(`messages.date_sent < ${toUnixTimestamp(before)}`);
  }

  if (after) {
    filters.push(`messages.date_sent > ${toUnixTimestamp(after)}`);
  }

  if (from) {
    filters.push(`addresses.address = ${toSqlStringLiteral(from)}`);
  }

  const query = `
    SELECT messages.ROWID as id
    FROM messages
    LEFT JOIN addresses ON addresses.ROWID = messages.sender
    LEFT JOIN subjects ON messages.subject = subjects.ROWID
    LEFT JOIN summaries ON messages.summary = summaries.ROWID
    LEFT JOIN mailboxes ON messages.mailbox = mailboxes.ROWID
    ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
    ORDER BY messages.date_sent ${order}, messages.ROWID ${order};
  `;

  const databasePath = await getDatabasePath();
  const relativePaths: string[] = [];
  const matchedMessageIds = new Set<number>();
  let candidateOffset = 0;
  let skippedMatches = 0;

  while (relativePaths.length < resultLimit) {
    const candidates = await executeSQL<{ id: number }>(
      databasePath,
      `${query.replace(/;\s*$/, "")} LIMIT ${CANDIDATE_BATCH_SIZE} OFFSET ${candidateOffset};`,
    );
    if (candidates.length === 0) {
      break;
    }
    candidateOffset += candidates.length;

    const messageOrder = new Map(candidates.map(({ id }, index) => [id, index]));
    const candidateGlobs = candidates.flatMap(({ id }) => ["-g", `**/${id}.{emlx,partial.emlx}`]);
    const trashGlobs = includeTrash ? [] : trashMailboxGlobs.flatMap((glob) => ["-g", glob]);
    const args = search
      ? [search, ...candidateGlobs, ...trashGlobs, "-i", "-l", basePath]
      : ["--files", ...candidateGlobs, ...trashGlobs, basePath];
    const { stdout, stderr } = await execa({ reject: false })(rgPath, args);

    if (stderr) {
      throw new Error("Error searching messages");
    }

    const batchPaths = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((path) => messageOrder.has(getIdFromPath(path)))
      .filter((path) => includeTrash || !isTrashPath(path))
      .filter((path) => !mailbox || isMailboxPath(path, mailbox))
      .toSorted((a, b) => messageOrder.get(getIdFromPath(a))! - messageOrder.get(getIdFromPath(b))!);

    for (const path of batchPaths) {
      const id = getIdFromPath(path);
      if (matchedMessageIds.has(id)) {
        continue;
      }
      matchedMessageIds.add(id);

      if (skippedMatches < offset) {
        skippedMatches++;
        continue;
      }

      relativePaths.push(path);
      if (relativePaths.length === resultLimit) {
        break;
      }
    }
  }

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
        ...(includeBody ? { text } : {}),
      };
    }),
  );
}
