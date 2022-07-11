import { readFileSync, writeFileSync, existsSync } from "fs";
import { environment } from "@raycast/api";

export const pagesConfigPath = environment.supportPath + "/pages.json";
export const defaultPagesConfig = [];

export function getPageIds() {
  if (!existsSync(pagesConfigPath)) setPageIds(defaultPagesConfig);
  const pagesConfig = JSON.parse(readFileSync(pagesConfigPath).toString());
  return pagesConfig as string[];
}

export function setPageIds(ids: string[]) {
  writeFileSync(pagesConfigPath, JSON.stringify(ids));
}

export function addPageId(id: string) {
  const pages = getPageIds();
  pages.push(id);
  setPageIds(pages);
  return pages;
}

export function removePageIdByIndex(index: number) {
  const pages = getPageIds();
  pages.splice(index, 1);
  setPageIds(pages);
  return pages;
}

export function removePageId(id: string) {
  const pages = getPageIds();
  const index = pages.indexOf(id);
  if (index > -1) pages.splice(index, 1);
  setPageIds(pages);
  return pages;
}
