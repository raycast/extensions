import { environment } from "@raycast/api";
import { Category, ReactIcon } from "./types";
import fetch from "node-fetch";
import fs from "fs";

export const categories: Category[] = JSON.parse(
  fs.readFileSync(`${environment.assetsPath}/categories.json`, { encoding: "utf-8" })
);

export const loadCategoryIcons = (category: string): Category => {
  const path = `${environment.assetsPath}/icons/${category}.json`;
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
};

export const getPath = (icon: string, category: string): string => {
  return encodeURI(`https://react-icons.s3.us-west-1.amazonaws.com/${category}/${icon}.svg`);
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
    categories.forEach((category) => {
      category = loadCategoryIcons(category.title);
      const id = category.id;
      const title = category.title;
      category.icons?.forEach((icon) => {
        if (icon.toLowerCase().includes(searchText)) {
          results.push({ icon, category: { id, title } });
        }
      });
    });
    return results;
  }
  return [];
};
