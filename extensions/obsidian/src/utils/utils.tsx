import { getPreferenceValues } from "@raycast/api";

import fs from "fs";
import path from "path";

import { Note, Vault, SearchNotePreferences, Preferences } from "../utils/interfaces";

export function getNoteContent(note: Note) {
  const pref: SearchNotePreferences = getPreferenceValues();

  let content = "";

  try {
    content = fs.readFileSync(note.path, "utf8") as string;
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
    .split(path.sep)
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

export function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }))
    .filter((vault) => !!vault);
}
