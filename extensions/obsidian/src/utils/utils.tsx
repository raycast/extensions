import { getPreferenceValues, Clipboard } from "@raycast/api";

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

import { BYTES_PER_MEGABYTE } from "./constants";

export function getNoteFileContent(path: string) {
  const pref: SearchNotePreferences = getPreferenceValues();

  let content = "";

  try {
    content = fs.readFileSync(path, "utf8") as string;
  } catch {
    content = "Couldn't read file. Did you move, delete or rename the file?";
  }

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

  // console.log("Got note content for note: ", path);
  // const memory = process.memoryUsage();
  // console.log((memory.heapUsed / 1024 / 1024 / 1024).toFixed(4), "GB");

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
      return aTitle.length - bTitle.length;
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
  return size / BYTES_PER_MEGABYTE;
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
