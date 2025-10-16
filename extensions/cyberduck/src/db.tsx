import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import { ConnectionEntry, parseBookmark, parseHistory } from "./types";
import { XMLParser } from "fast-xml-parser";
import path from "path";

const DUCK_PATH = `${homedir()}/Library/Group Containers/G69SCX94XU.duck/Library/Application Support/duck/`;
const BOOKMARKS_PATH = `${DUCK_PATH}/Bookmarks/`;
const HISTORY_PATH = `${DUCK_PATH}/History/`;

export async function getConnections(): Promise<ConnectionEntry[]> {
  const out: ConnectionEntry[] = [];
  const parser = new XMLParser();
  const bookmarkFiles = await readdir(BOOKMARKS_PATH);
  const bookmarkIds: { [key: string]: boolean } = {};
  for (const bookmarkFile of bookmarkFiles) {
    const filePath = path.join(BOOKMARKS_PATH, bookmarkFile);
    const fileContent = await readFile(filePath, { flag: "r" });
    const jObj = parser.parse(fileContent);
    const bookmark = parseBookmark(jObj);
    bookmark.Path = filePath;
    bookmarkIds[bookmark.UUID] = true;
    out.push(bookmark);
  }
  const historyFiles = await readdir(HISTORY_PATH);
  for (const historyFile of historyFiles) {
    const filePath = path.join(HISTORY_PATH, historyFile);
    const fileContent = await readFile(filePath, { flag: "r" });
    const jObj = parser.parse(fileContent);
    const history = parseHistory(jObj);
    if (history.UUID in bookmarkIds) continue;
    history.Path = filePath;
    out.push(history);
  }
  return out;
}
