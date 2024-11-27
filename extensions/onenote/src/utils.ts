import { closeMainWindow, Color, Icon, LocalStorage, Cache } from "@raycast/api";
import { exec } from "child_process";
import { GROUP, NOTEBOOK, OneNoteItem, PAGE, SECTION } from "./types";
import dateFormat from "dateformat";
import { readdirSync } from "fs";
import { runAppleScript } from "run-applescript";
import { resolve } from "path";
import { homedir } from "os";

const ONENOTE_USER_INFO_CACHE = resolve(
  homedir(),
  "Library/Containers/com.microsoft.onenote.mac/Data/Library/Application Support/Microsoft/UserInfoCache/"
);

export async function newNote(parent: OneNoteItem | undefined) {
  // Copy search string (as new note title)
  await runAppleScript(`
        tell application "System Events"
            keystroke "a" using command down
            keystroke "c" using command down
        end tell
        tell application "Microsoft OneNote" to activate
    `);

  // open parent page (if defined)
  if (parent != undefined) await openNote(parent);

  // create new note and paste clipboard as title
  runAppleScript(`
        delay 1.0
        tell application "System Events"
            keystroke "n" using command down
            delay 0.5
            keystroke "v" using command down
        end tell
    `);
}

export async function openNote(item: OneNoteItem) {
  let cmd = await getUrl(item);
  cmd = "open " + cmd?.replaceAll(" ", "%20").replaceAll("&", "%26").replaceAll("{", "%7B").replaceAll("}", "%7D");
  console.log(cmd);
  exec(cmd, (_err, _sdtout, _stderr) => {
    closeMainWindow();
  });
}

async function getUrl(item: OneNoteItem) {
  const userid: string = await get_user_uid();

  if (item.Type == PAGE) return `onenote:#page-id=${item.GUID}`;
  if (item.Type == SECTION)
    return `onenote:https://d.docs.live.net/${userid}/Documents/${getAncestorsStr(item, "/", true)}.one`;
  if (item.Type == GROUP)
    return `onenote:https://d.docs.live.net/${userid}/Documents/${getAncestorsStr(item, "/", true)}/`;
  if (item.Type == NOTEBOOK) return `onenote:https://d.docs.live.net/${userid}/Documents/${item.Title}`;
}

export function getAncestorsStr(item: OneNoteItem | undefined, separator: string, includeSelf = true) {
  // TODO BUG HERE: WEIRD ORDER WITH NESTED SECTION GROUPS
  if (item == undefined) return "";
  const gpGOIDs: string[] = split_grandparents(item);
  const ancestors: string[] = gpGOIDs.map((x) => getCachedTitle(x));
  if (item.ParentGOID) ancestors.push(getParentTitle(item));
  if (includeSelf) ancestors.push(item.Title);
  return ancestors.join(separator);
}

export function parseDatetime(datetime: number): string {
  // BUG LastModifiedTime from onenote database ?? (not UTC-compliant ??)
  // Unable to find real conversion. Using best approximation
  const corrected = datetime / 10000 - 11644470000000;

  const now = Date.now();
  const val = new Date(corrected);
  const diff = now.valueOf() - val.valueOf();
  if (diff > 1000 * 3600 * 24 * 90) return String(val.getFullYear());
  if (diff > 1000 * 3600 * 24 * 7) return dateFormat(val, "d mmm");
  return dateFormat(val, "ddd d");
}

export function getIcon(item: OneNoteItem) {
  if (item.Type == PAGE) return { source: Icon.Document, tintColor: Color.SecondaryText };
  if (item.Type == SECTION) return { source: Icon.Folder, tintColor: "#C35BE2" };
  if (item.Type == GROUP) return { source: Icon.ChevronRight, tintColor: "#C35BE2" };
  if (item.Type == NOTEBOOK) return { source: Icon.Tray, tintColor: Color.Purple };
}

async function get_user_uid(): Promise<string> {
  let ONENOTE_USER_UID = (await LocalStorage.getItem<string>("onenote-user-uid")) as string;
  if (ONENOTE_USER_UID != undefined) {
    return ONENOTE_USER_UID;
  }
  const files = readdirSync(ONENOTE_USER_INFO_CACHE);
  for (const file of files) {
    const indx = file.indexOf("LiveId.db");
    if (indx != -1) {
      ONENOTE_USER_UID = file.substring(0, indx - 1);
      break;
    }
  }
  await LocalStorage.setItem("onenote-user-uid", ONENOTE_USER_UID);
  return ONENOTE_USER_UID;
}

export function split_grandparents(item: OneNoteItem) {
  const parts = item.GrandparentGOIDs?.split("}");
  const newIds = [];
  let i = 0;
  while (i < parts?.length - 1) {
    newIds.push(`${parts[i]}}${parts[i + 1]}}`);
    i += 2;
  }
  return newIds;
}

export function getCachedTitle(GOID: string): string {
  const cache = new Cache();
  return String(cache.get(GOID));
}

export function getParentTitle(item: OneNoteItem): string {
  if (item.ParentGOID) return getCachedTitle(item.ParentGOID);
  else return "";
}
