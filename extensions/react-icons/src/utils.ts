import { environment } from "@raycast/api";
import { Category } from "./types";
import fs from "fs";

export const categories: string[] = JSON.parse(
  fs.readFileSync(`${environment.assetsPath}/categories.json`, { encoding: "utf-8" })
);

export const loadCategory = (category: string): Category => {
  const path = `${environment.assetsPath}/categories/${category}/icons.json`;
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
};

export const getPath = (icon: string, category: string): string => {
  return `${environment.assetsPath}/categories/${category}/${icon}.svg`;
};

export const getSVG = (path: string): string => {
  return fs.readFileSync(path, { encoding: "utf-8" });
};

export const formatCategoryTitle = (title: string): string => {
  return title.includes("Icons") ? title : `${title} Icons`;
};
