import * as fs from "fs";
import { LocalStorage, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { FolderAction } from "./types";

export default async function Command() {
  const entries = JSON.parse((await LocalStorage.getItem("entries")) || "[]");

  for (const entry of entries) {
    const knownStructure = JSON.parse((await LocalStorage.getItem(`dir-${entry.dir}`)) || "[]");

    const newStructure = getFolderContents(entry.dir);

    if (knownStructure.length > newStructure.length) {
      for (const item of knownStructure) {
        if (!newStructure.includes(item)) {
          for (const action of entry.removeActions) {
            runAction(action, item, entry.dir);
          }
        }
      }
    } else if (knownStructure.length > 0 && knownStructure.length < newStructure.length) {
      for (const item of newStructure) {
        if (!knownStructure.includes(item)) {
          for (const action of entry.addActions) {
            runAction(action, item, entry.dir);
          }
        }
      }
    }

    await LocalStorage.setItem(`dir-${entry.dir}`, JSON.stringify(newStructure));
  }
}

const replacePlaceholders = (str: string, itemPath: string, dir: string, action: FolderAction): string => {
  return str
    .replace("{item}", itemPath)
    .replace("{dir}", dir)
    .replace("{event}", action.type.includes("Add") ? "Added" : "Removed");
};

const runAction = async (action: FolderAction, itemPath: string, dir: string) => {
  if (action.type === "openPathAdd" || action.type === "openPathRemove") {
    const targetsStr = replacePlaceholders((action["targets"] as string[]).join('" "'), itemPath, dir, action);
    execSync(`open "${targetsStr}"`);
  } else if (action.type === "openURLAdd" || action.type === "openURLRemove") {
    execSync(`open "${action["target"]}"`);
  } else if (action.type === "scriptAdd" || action.type === "scriptRemove") {
    execSync(replacePlaceholders(action["value"] as string, itemPath, dir, action));
  } else if (action.type === "hudAdd" || action.type === "hudRemove") {
    showHUD(replacePlaceholders(action["text"] as string, itemPath, dir, action));
  } else if (action.type === "soundAdd" || action.type === "soundRemove") {
    execSync(`afplay "/System/Library/Sounds/${action["soundName"]}"`);
  } else if (action.type === "notificationAdd" || action.type === "notificationRemove") {
    execSync(
      `osascript -e 'display notification "${replacePlaceholders(
        action["text"] as string,
        itemPath,
        dir,
        action
      )}" with title "${replacePlaceholders(
        action["title"] as string,
        itemPath,
        dir,
        action
      )}" subtitle "${replacePlaceholders(action["subtitle"] as string, itemPath, dir, action)}" sound name "${
        action["soundName"]
      }"'`
    );
  } else if (action.type === "alertAdd" || action.type === "alertRemove") {
    execSync(
      `osascript -e 'display alert "${replacePlaceholders(
        action["title"] as string,
        itemPath,
        dir,
        action
      )}" message "${replacePlaceholders(action["message"] as string, itemPath, dir, action)}"'`
    );
  }
};

const getFolderContents = (folderPath: string): string[] => {
  const files: string[] = [];
  const dir = fs.readdirSync(folderPath, { withFileTypes: true });
  dir.forEach((file) => {
    if (file.isDirectory()) {
      try {
        files.push(...getFolderContents(`${folderPath}/${file.name}/`));
      } catch (error) {
        console.log(error);
      }
    } else {
      files.push(`${folderPath}/${file.name}`);
    }
  });
  return files;
};
