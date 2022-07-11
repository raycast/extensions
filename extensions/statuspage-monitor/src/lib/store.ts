import { readFileSync, writeFileSync, existsSync } from "fs";
import { environment, LocalStorage } from "@raycast/api";

export const defaultPagesConfig = ["kctbh9vrtdwd", "srhpyqt94yxb", "yh6f0r4529hb"];

export async function getPageIds() {
  const pageIdStore = await LocalStorage.getItem<string>("pages");
  if (!pageIdStore) {
    await LocalStorage.setItem("pages", JSON.stringify(defaultPagesConfig));
    return defaultPagesConfig;
  }
  const pageIds = JSON.parse(pageIdStore) as string[];
  return pageIds;
}

export async function setPageIds(ids: string[]) {
  return await LocalStorage.setItem("pages", JSON.stringify(ids));
}

export async function addPageId(id: string) {
  const pages = await getPageIds();
  pages.push(id);
  await setPageIds(pages);
  return pages;
}

export async function removePageIdByIndex(index: number) {
  const pages = await getPageIds();
  pages.splice(index, 1);
  await setPageIds(pages);
  return pages;
}

export async function removePageId(id: string) {
  const pages = await getPageIds();
  const index = pages.indexOf(id);
  if (index > -1) pages.splice(index, 1);
  await setPageIds(pages);
  return pages;
}
