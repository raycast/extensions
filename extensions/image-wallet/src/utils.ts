import { environment, getPreferenceValues } from "@raycast/api";

import { basename, extname } from "path";
import { lstatSync, readdirSync } from "fs";

import { Pocket, Card, Preferences } from "./types";

export const walletPath = getWalletPath();

function getWalletPath() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.walletDirectory) {
    const definedDir = lstatSync(preferences.walletDirectory);
    if (definedDir.isDirectory()) return preferences.walletDirectory;
  }
  return environment.supportPath;
}

export async function fetchFiles(dir: string): Promise<Pocket[]> {
  const pocketArr: Pocket[] = [];

  loadPocketCards(dir).then((cards) => {
    if (cards.length > 0) pocketArr.push({ cards: cards });
  });
  const items = readdirSync(walletPath);
  items.forEach((item) => {
    const filePath = `${dir}/${item}`;
    const fileStats = lstatSync(filePath);
    const fileExt = extname(filePath);
    const fileName = basename(filePath, fileExt);

    if (!fileStats.isDirectory()) return;
    if (fileName.startsWith(".")) return;

    loadPocketCards(`${dir}/${item}`).then((cards) => {
      pocketArr.push({ name: item, cards: cards });
    });
  });

  return pocketArr;
}

async function loadPocketCards(dir: string): Promise<Card[]> {
  const cardArr: Card[] = [];

  const items = readdirSync(dir);
  items.forEach((item) => {
    const filePath = `${dir}/${item}`;
    const fileStats = lstatSync(filePath);
    const fileExt = extname(filePath);
    const fileName = basename(filePath, fileExt);

    if (fileStats.isDirectory()) return;
    if (fileName.startsWith(".")) return;

    cardArr.push({ name: fileName, path: filePath });
  });

  return cardArr;
}
