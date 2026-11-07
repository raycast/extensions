/**
 * File type list assembly:
 * - built-in types are toggled via checkbox preferences (Raycast Settings)
 * - custom types live in LocalStorage and are edited via the Configure File Types command
 */
import { Icon, LocalStorage } from "@raycast/api";
import { FILE_TYPES, type FileType } from "./file-types.js";

export interface TypePrefs {
  showFolder?: boolean;
  showDoc?: boolean;
  showImage?: boolean;
  showVideo?: boolean;
  showAudio?: boolean;
  showArchive?: boolean;
  showApp?: boolean;
  showCode?: boolean;
  showFont?: boolean;
  showTorrent?: boolean;
}

const PREF_BY_ID: Record<string, keyof TypePrefs> = {
  folder: "showFolder",
  doc: "showDoc",
  image: "showImage",
  video: "showVideo",
  audio: "showAudio",
  archive: "showArchive",
  app: "showApp",
  code: "showCode",
  font: "showFont",
  torrent: "showTorrent",
};

const CUSTOM_KEY = "everything.customFileTypes";

/** Load custom types from LocalStorage; malformed entries are dropped. */
export async function loadCustomTypes(): Promise<FileType[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as FileType[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t) => t && t.id && t.label)
      .map((t) => ({ ...t, icon: t.icon || Icon.Document }));
  } catch {
    return [];
  }
}

export async function saveCustomTypes(types: FileType[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_KEY, JSON.stringify(types));
}

/** All (always first) + built-ins enabled by checkbox prefs + custom types. */
export function buildTypeDefs(
  prefs: TypePrefs,
  custom: FileType[],
): FileType[] {
  const builtin = FILE_TYPES.filter((t) => {
    if (t.id === "all") return true;
    const key = PREF_BY_ID[t.id];
    return key === undefined ? true : prefs[key] !== false;
  });
  return [...builtin, ...custom];
}
