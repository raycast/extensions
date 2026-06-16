import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { ActionType, Data, Link } from "./type";
import { closeMainWindow, Keyboard, popToRoot } from "@raycast/api";

export const dataFilePath = path.join(homedir(), "raycast-link-transformer-data.json");

export function readData(): Data {
  try {
    return JSON.parse(readFileSync(dataFilePath, "utf8")) as Data;
  } catch {
    return { links: [], actions: [] };
  }
}

export function writeData(data: Data): void {
  writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

export function processAliases(aliasesStr: string): string[] {
  return aliasesStr
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a);
}

export async function closeExtension() {
  closeMainWindow().then(() => {
    popToRoot({ clearSearchBar: true });
  });
}

export function executeCode(code: string, url: string): string {
  try {
    return new Function("url", `return (${code})`)(url);
  } catch (error) {
    console.error("Error executing action code:", error);
    return url;
  }
}

// handle link
export function deleteLink(id: string): void {
  const data = readData();
  data.links = data.links.filter((l) => l.id !== id);
  writeData(data);
}

export function addLink(url: string, aliases: string[]): void {
  const data = readData();
  const newLink: Link = {
    id: Date.now().toString(),
    url,
    aliases,
  };
  data.links.push(newLink);
  writeData(data);
}

export function updateLink(id: string, url: string, aliases: string[]): void {
  const data = readData();
  data.links = data.links.map((l) => (l.id === id ? { ...l, url, aliases } : l));
  writeData(data);
}

// handle action
export function deleteAction(id: string): void {
  const data = readData();
  data.actions = data.actions.filter((a) => a.id !== id);
  writeData(data);
}

export function addAction(value: ActionType) {
  const existing = readData();
  existing.actions.push(value);
  writeData(existing);
}

export function updateAction(
  id: string,
  name: string,
  code: string,
  hasShortcut: boolean,
  modifiers?: string[],
  key?: string,
): void {
  const data = readData();
  const shortcut =
    hasShortcut && modifiers && key
      ? { modifiers: modifiers.map((s) => s as Keyboard.KeyModifier), key: key as Keyboard.KeyEquivalent }
      : undefined;
  data.actions = data.actions.map((a) => (a.id === id ? { ...a, name, code, shortcut } : a));
  writeData(data);
}
