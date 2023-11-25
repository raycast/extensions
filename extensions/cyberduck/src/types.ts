// import { existsSync } from "fs";
// import { URL } from "url";

enum ConnectionType {
  Bookmark,
  History,
}

export interface ConnectionEntry {
  Type: ConnectionType;
  Path: string;

  UUID: string;
  Nickname: string;
  Protocol: string;
  Hostname: string;
  Port: number;
  Username: string;
}

function dictToMap(keys: Array<string>, values: Array<any>): any {
  const out: any = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = values[i];
    if (v) out[k] = v;
  }
  return out;
}

function parseEntry(entry: ConnectionEntry, data: any): ConnectionEntry {
  const dict = data && data.plist && data.plist.dict;
  const map = dictToMap(dict.key, dict.string);

  entry.Hostname = map["Hostname"];
  entry.Nickname = map["Nickname"];
  entry.Port = map["Port"];
  entry.Protocol = map["Protocol"];
  entry.UUID = map["UUID"];
  entry.Username = map["Username"];

  return entry;
}

export function parseBookmark(data: any): ConnectionEntry {
  const entry = {
    Type: ConnectionType.Bookmark,
  } as ConnectionEntry;
  return parseEntry(entry, data);
}

export function parseHistory(data: any): ConnectionEntry {
  const entry = {
    Type: ConnectionType.History,
  } as ConnectionEntry;
  return parseEntry(entry, data);
}

export function isBookmarkEntry(entry: ConnectionEntry): boolean {
  const { Type } = entry;
  return Type === ConnectionType.Bookmark;
}

export function isHistoryEntry(entry: ConnectionEntry): boolean {
  const { Type } = entry;
  return Type === ConnectionType.History;
}
