import { queryOptions } from "@tanstack/react-query";
import "cross-fetch/polyfill";
import { readFile, writeFile } from "fs/promises";
import { PopiconVariant } from "../enums/popicon-variant";
import { getPopiconApiUrl } from "../helpers/get-popicon-api-url";
import { getPopiconCategories } from "../helpers/get-popicon-categories";
import { getPopiconStoragePath } from "../helpers/get-popicon-storage-path";
import { isOnline } from "../helpers/is-online";
import { Popicon } from "../schemas/popicon";
import { PopiconResponse } from "../schemas/popicon-response";

async function fetchPopicons(variant: PopiconVariant) {
  const url = getPopiconApiUrl(variant);
  const response = await fetch(url);
  const json = await response.json();
  return PopiconResponse.parse(json);
}

async function loadPopiconsFromStorage(variant: PopiconVariant) {
  const path = getPopiconStoragePath(variant);
  const data = await readFile(path, "utf-8");
  const json = JSON.parse(data);

  return PopiconResponse.parse(json);
}

async function savePopiconsToStorage(variant: PopiconVariant, icons: PopiconResponse) {
  const path = getPopiconStoragePath(variant);
  return await writeFile(path, JSON.stringify(icons), { flag: "w" });
}

type PopiconQueryOptions = Partial<{
  onNewIcons: (newIcons: Array<Popicon>) => void;
}>;

async function queryFn(variant: PopiconVariant, options?: PopiconQueryOptions) {
  const storedIcons = await loadPopiconsFromStorage(variant);

  if (!(await isOnline())) {
    return storedIcons;
  }

  const icons = await fetchPopicons(variant);
  savePopiconsToStorage(variant, icons);

  if (icons.data.length > storedIcons.data.length) {
    const existingIconNames = new Set(storedIcons.data.map(({ icon }) => icon));
    const newIcons = icons.data.filter(({ icon }) => !existingIconNames.has(icon));
    options?.onNewIcons?.(newIcons);
  }

  return icons;
}

export function popiconCategoriesQuery(variant: PopiconVariant, options?: PopiconQueryOptions) {
  return queryOptions({
    queryKey: ["popicons", variant],
    queryFn: async () => await queryFn(variant, options),
    select: ({ data }) => {
      return getPopiconCategories(data);
    },
  });
}
