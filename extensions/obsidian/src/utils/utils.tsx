import { getPreferenceValues, Clipboard, Icon, Toast, confirmAlert, showToast } from "@raycast/api";

import fs from "fs";
import fsPath from "path";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";

import {
  Note,
  ObsidianJson,
  ObsidianVaultsState,
  Preferences,
  SearchNotePreferences,
  Vault,
} from "../utils/interfaces";

import { BYTES_PER_KILOBYTE } from "./constants";
import { isNotePinned, unpinNote } from "./PinNoteUtils";

function filterContent(content: string) {
  const pref: SearchNotePreferences = getPreferenceValues();

  if (pref.removeYAML) {
    const yamlHeader = content.match(/---(.|\n)*?---/gm);
    if (yamlHeader) {
      content = content.replace(yamlHeader[0], "");
    }
  }
  if (pref.removeLatex) {
    const latex = content.matchAll(/\$\$(.|\n)*?\$\$/gm);
    for (const match of latex) {
      content = content.replace(match[0], "");
    }
    const latex_one = content.matchAll(/\$(.|\n)*?\$/gm);
    for (const match of latex_one) {
      content = content.replace(match[0], "");
    }
  }
  if (pref.removeLinks) {
    content = content.replaceAll("![[", "");
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  }
  return content;
}

export function getNoteFileContent(path: string, filter = true) {
  let content = "";

  try {
    content = fs.readFileSync(path, "utf8") as string;
  } catch {
    content = "Couldn't read file. Did you move, delete or rename the file?";
  }

  if (filter) {
    content = filterContent(content);
  }

  return content;
}

export function vaultPluginCheck(vaults: Vault[], plugin: string) {
  const vaultsWithoutPlugin: Vault[] = [];
  vaults = vaults.filter((vault: Vault) => {
    const communityPluginsPath = vault.path + "/.obsidian/community-plugins.json";
    if (!fs.existsSync(communityPluginsPath)) {
      vaultsWithoutPlugin.push(vault);
    } else {
      const plugins: string[] = JSON.parse(fs.readFileSync(communityPluginsPath, "utf-8"));

      if (plugins.includes(plugin)) {
        return vault;
      } else {
        vaultsWithoutPlugin.push(vault);
      }
    }
  });
  return [vaults, vaultsWithoutPlugin];
}

function getVaultNameFromPath(vaultPath: string): string {
  const name = vaultPath
    .split(fsPath.sep)
    .filter((i) => {
      if (i != "") {
        return i;
      }
    })
    .pop();
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

export function parseVaults(): Vault[] {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .filter((vaultPath) => vaultPath.trim() !== "")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }));
}

async function loadObsidianJson(): Promise<Vault[]> {
  const obsidianJsonPath = fsPath.resolve(`${homedir()}/Library/Application Support/obsidian/obsidian.json`);
  try {
    const obsidianJson = JSON.parse(await readFile(obsidianJsonPath, "utf8")) as ObsidianJson;
    return Object.values(obsidianJson.vaults).map(({ path }) => ({
      name: getVaultNameFromPath(path),
      key: path,
      path,
    }));
  } catch (e) {
    return [];
  }
}

export function useObsidianVaults(): ObsidianVaultsState {
  const pref = useMemo(() => getPreferenceValues(), []);
  const [state, setState] = useState<ObsidianVaultsState>(
    pref.vaultPath
      ? {
          ready: true,
          vaults: parseVaults(),
        }
      : { ready: false, vaults: [] }
  );

  useEffect(() => {
    if (!state.ready) {
      loadObsidianJson()
        .then((vaults) => {
          setState({ vaults, ready: true });
        })
        .catch(() => setState({ vaults: parseVaults(), ready: true }));
    }
  }, []);

  return state;
}

export async function deleteNote(note: Note, vault: Vault) {
  const options = {
    title: "Delete Note",
    message: 'Are you sure you want to delete the note: "' + note.title + '"?',
    icon: Icon.ExclamationMark,
  };
  if (await confirmAlert(options)) {
    try {
      fs.unlinkSync(note.path);
      if (isNotePinned(note, vault)) {
        unpinNote(note, vault);
      }
      showToast({ title: "Deleted Note", style: Toast.Style.Success });
      return true;
    } catch (error) {
      return false;
    }
  } else {
    return false;
  }
}

export function filterNotes(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }
  return notes
    .filter((note) => {
      if (byContent) {
        return (
          note.title.toLowerCase().includes(input.toLowerCase()) ||
          note.content.toLowerCase().includes(input.toLowerCase())
        );
      } else {
        return note.title.toLowerCase().includes(input.toLowerCase());
      }
    })
    .sort((a: Note, b: Note) => {
      const aTitle = a.title;
      const bTitle = b.title;
      if (aTitle > bTitle) {
        return 1;
      } else if (aTitle < bTitle) {
        return -1;
      } else {
        return 0;
      }
    });
}

export function wordCount(str: string) {
  return str.split(" ").length;
}

export function readingTime(str: string) {
  return Math.ceil(wordCount(str) / 200);
}

export function createdDateFor(note: Note) {
  const { birthtime } = fs.statSync(note.path);
  return birthtime;
}

export function fileSizeFor(note: Note) {
  const { size } = fs.statSync(note.path);
  return size / BYTES_PER_KILOBYTE;
}

export function trimPath(path: string, maxLength: number) {
  if (path.length > maxLength) {
    return "..." + path.slice(path.length - maxLength).slice(1);
  } else {
    return path.slice(1);
  }
}

export async function getClipboardContent() {
  const clipboardText = await Clipboard.readText();
  if (clipboardText) {
    return clipboardText;
  } else {
    return "";
  }
}

export const dayMapping: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const monthMapping: Record<number, string> = {
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
  4: "May",
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
};

export async function applyTemplates(content: string) {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  const timestamp = Date.now().toString();

  content = content.replaceAll("{time}", date.toLocaleTimeString());
  content = content.replaceAll("{date}", date.toLocaleDateString());

  content = content.replaceAll("{year}", date.getFullYear().toString());
  content = content.replaceAll("{month}", monthMapping[date.getMonth()]);
  content = content.replaceAll("{day}", dayMapping[date.getDay()]);

  content = content.replaceAll("{hour}", hours);
  content = content.replaceAll("{minute}", minutes);
  content = content.replaceAll("{second}", seconds);
  content = content.replaceAll("{millisecond}", date.getMilliseconds().toString());

  content = content.replaceAll("{timestamp}", timestamp);
  content = content.replaceAll("{zettelkastenID}", timestamp);

  const clipboard = await getClipboardContent();
  content = content.replaceAll("{clipboard}", clipboard);

  return content;
}
