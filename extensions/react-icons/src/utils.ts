import { environment } from "@raycast/api";
import { Category, ReactIcon } from "./types";
import fetch from "node-fetch";
import fs from "fs";

export const categories: string[] = JSON.parse(
  fs.readFileSync(`${environment.assetsPath}/categories.json`, { encoding: "utf-8" })
);

export const loadCategory = (category: string): Category => {
  const path = `${environment.assetsPath}/icons/${category}.json`;
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
};

export const getPath = (icon: string, category: string): string => {
  return encodeURI(
    `https://raw.githubusercontent.com/yugtesh/react-icons/05c613b08465a76b2340baffb1c8614d0f30b761/${category}/${icon}.svg`
  );
};

export const getSVG = async (path: string): Promise<string> => {
  const response = await fetch(path);
  return await response.text();
};

export const formatCategoryTitle = (title: string): string => {
  return title.includes("Icons") ? title : `${title} Icons`;
};

export const searchIcons = (searchText: string): ReactIcon[] => {
  if (searchText.length >= 2) {
    searchText = searchText.replaceAll(" ", "").toLowerCase();
    const results: ReactIcon[] = [];
    categories.forEach((categoryName) => {
      const category = loadCategory(categoryName);
      const id = category.id;
      const title = category.title;
      category.icons.forEach((icon) => {
        if (icon.toLowerCase().includes(searchText)) {
          results.push({ icon, category: { id, title } });
        }
      });
    });
    return results;
  } else {
    return [];
  }
};
